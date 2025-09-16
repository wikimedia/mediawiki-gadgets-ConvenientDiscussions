import cd from './cd';
import CdError from './shared/CdError';
import { defined, removeDoubleSpaces, sleep, unique } from './shared/utils-general';
import { handleApiReject } from './utils-api';

/**
 * @typedef {import('./Autocomplete').AutocompleteType} AutocompleteType
 */

/**
 * @typedef {import('./Autocomplete').AutocompleteConfigShared} AutocompleteConfigShared
 */

/**
 * @template {any} [T=any]
 * @typedef {object} Value
 * @property {string} [key]
 * @property {T} item
 * @property {(() => import('./tribute/Tribute').InsertData) | undefined} [transform]
 */

/**
 * Abstract base class for all autocomplete types. Provides shared functionality for caching,
 * validation, result processing, and API request handling.
 *
 * @abstract
 */
class BaseAutocomplete {
  /**
   * Cache for storing API results by query text.
   *
   * @type {{ [key: string]: string[] }}
   */
  cache = {};

  /**
   * Results from the last API request.
   *
   * @type {string[]}
   */
  lastResults = [];

  /**
   * The last query text that was processed.
   *
   * @type {string}
   */
  lastQuery = '';

  /**
   * Default items to search across (may be more narrow than all potential values).
   *
   * @type {any[]}
   */
  default = [];

  /**
   * Function for lazy loading of default items.
   *
   * @type {(() => any[]) | undefined}
   */
  defaultLazy;

  /**
   * Additional data used by autocomplete methods.
   *
   * @type {{ [key: string]: any }}
   */
  data = {};

  /**
   * API configuration for requests.
   *
   * @type {{ ajax: { timeout: number } }}
   * @static
   */
  static apiConfig = { ajax: { timeout: 1000 * 5 } };

  /**
   * Delay before making API requests to avoid excessive requests.
   *
   * @type {number}
   * @static
   */
  static delay = 100;

  /**
   * Current promise for tracking superseded requests.
   *
   * @type {Promise<any> | undefined}
   * @static
   */
  static currentPromise;

  /**
   * Create a base autocomplete instance.
   *
   * @param {AutocompleteConfigShared} [config={}] Configuration options
   */
  constructor(config = {}) {
    Object.assign(this, config);
  }

  /**
   * Get the display label for this autocomplete type.
   *
   * @abstract
   * @returns {string}
   */
  getLabel() {
    throw new CdError({
      type: 'internal',
      message: 'getLabel() must be implemented by subclass',
    });
  }

  /**
   * Get the trigger character(s) for this autocomplete type.
   *
   * @abstract
   * @returns {string}
   */
  getTrigger() {
    throw new CdError({
      type: 'internal',
      message: 'getTrigger() must be implemented by subclass',
    });
  }

  /**
   * Transform an item into insert data for the Tribute library.
   *
   * @abstract
   * @param {any} item The item to transform
   * @returns {import('./tribute/Tribute').InsertData}
   */
  transformItemToInsertData(item) {
    throw new CdError({
      type: 'internal',
      message: 'transformItemToInsertData() must be implemented by subclass',
    });
  }

  /**
   * Validate input text for this autocomplete type.
   *
   * @abstract
   * @param {string} text The input text to validate
   * @returns {boolean} Whether the input is valid
   */
  validateInput(text) {
    throw new CdError({
      type: 'internal',
      message: 'validateInput() must be implemented by subclass',
    });
  }

  /**
   * Make an API request to get autocomplete suggestions.
   *
   * @abstract
   * @param {string} text The search text
   * @returns {Promise<string[]>} Promise resolving to array of suggestions
   */
  async makeApiRequest(text) {
    throw new CdError({
      type: 'internal',
      message: 'makeApiRequest() must be implemented by subclass',
    });
  }

  /**
   * Get autocomplete values for the given text. This is the main method called by Tribute.
   *
   * @param {string} text The search text
   * @param {Function} callback Callback function to call with results
   * @returns {Promise<void>}
   */
  async getValues(text, callback) {
    text = removeDoubleSpaces(text);

    // Reset results if query doesn't start with last query
    if (this.lastQuery && !text.startsWith(this.lastQuery)) {
      this.lastResults = [];
    }
    this.lastQuery = text;

    // Check cache first
    const cachedResults = this.handleCache(text);
    if (cachedResults) {
      callback(this.processResults(cachedResults, this));
      return;
    }

    // Get local matches
    const localMatches = this.searchLocal(text, this.getDefaultItems());
    let values = localMatches.slice();

    // Determine if we should make an API request
    const shouldMakeRequest = this.validateInput(text);

    if (shouldMakeRequest) {
      // If no local matches, include previous results
      if (!localMatches.length) {
        values.push(...this.lastResults);
      }
      values = this.searchLocal(text, values);

      // Add user-typed text as last option
      const trimmedText = text.trim();
      if (trimmedText) {
        values.push(trimmedText);
      }
    }

    callback(this.processResults(values, this));

    // Make API request if needed
    if (shouldMakeRequest && !localMatches.length) {
      try {
        const apiResults = await this.makeApiRequest(text);

        // Check if request is still current
        if (this.lastQuery !== text) return;

        this.lastResults = apiResults.slice();

        // Add user-typed text as last option
        const trimmedText = text.trim();
        if (trimmedText) {
          apiResults.push(trimmedText);
        }

        this.updateCache(text, apiResults);
        callback(this.processResults(apiResults, this));
      } catch (error) {
        // Silently handle API errors to avoid disrupting user experience
        console.warn('Autocomplete API request failed:', error);
      }
    }
  }

  /**
   * Process raw results into Value objects for Tribute.
   *
   * @param {any[]} items Raw items to process
   * @param {AutocompleteConfigShared} config Configuration object
   * @returns {Value[]} Processed values
   */
  processResults(items, config) {
    return items
      .filter(defined)
      .filter((item) => item !== null)
      .filter(unique)
      .map((item) => {
        /** @type {string} */
        let key;
        if (Array.isArray(item)) {
          // Tags
          key = item[0];
        } else if (typeof item === 'object' && item !== null && 'key' in item) {
          // Comment links
          key = item.key;
        } else {
          // The rest
          key = item;
        }

        /** @type {Value} */
        const value = { key, item };
        value.transform = config.transformItemToInsertData?.bind(value);

        return value;
      });
  }

  /**
   * Search for text in a local list of items.
   *
   * @param {string} text Search text
   * @param {string[]} list List to search in
   * @returns {string[]} Matching results
   */
  searchLocal(text, list) {
    const containsRegexp = new RegExp(mw.util.escapeRegExp(text), 'i');
    const startsWithRegexp = new RegExp('^' + mw.util.escapeRegExp(text), 'i');
    return list
      .filter((item) => containsRegexp.test(item))
      .sort(
        (item1, item2) =>
          Number(startsWithRegexp.test(item2)) - Number(startsWithRegexp.test(item1))
      );
  }

  /**
   * Check cache for existing results.
   *
   * @param {string} text Search text
   * @returns {string[] | null} Cached results or null if not found
   */
  handleCache(text) {
    return this.cache[text] || null;
  }

  /**
   * Update cache with new results.
   *
   * @param {string} text Search text
   * @param {string[]} results Results to cache
   */
  updateCache(text, results) {
    this.cache[text] = results;
  }

  /**
   * Get default items, using lazy loading if available.
   *
   * @returns {any[]} Default items
   */
  getDefaultItems() {
    if (this.default.length === 0 && this.defaultLazy) {
      this.default = this.defaultLazy();
    }
    return this.default;
  }

  /**
   * Check if the specified promise is not the current promise to detect superseded requests.
   *
   * @param {Promise<any>} promise Promise to check
   * @throws {CdError} If promise is superseded
   * @static
   */
  static promiseIsNotSuperseded(promise) {
    if (promise !== this.currentPromise) {
      throw new CdError();
    }
  }

  /**
   * Create a promise with delay and supersession checking.
   *
   * @param {Function} executor Promise executor function
   * @returns {Promise<any>} Promise with delay and checking
   * @static
   */
  static createDelayedPromise(executor) {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve, reject) => {
      try {
        await sleep(this.delay);
        this.promiseIsNotSuperseded(promise);
        await executor(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
    this.currentPromise = promise;
    return promise;
  }

  /**
   * Make an OpenSearch API request.
   *
   * @param {object} params API parameters
   * @returns {Promise<import('./Autocomplete').OpenSearchResults>} OpenSearch results
   * @static
   */
  static async makeOpenSearchRequest(params) {
    return this.createDelayedPromise(async (resolve) => {
      const response = await cd
        .getApi(this.apiConfig)
        .get({
          action: 'opensearch',
          limit: 10,
          ...params,
        })
        .catch(handleApiReject);

      this.promiseIsNotSuperseded(this.currentPromise);
      resolve(response);
    });
  }
}

export default BaseAutocomplete;