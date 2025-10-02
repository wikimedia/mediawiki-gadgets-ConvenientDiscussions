import AutocompleteCache from './AutocompleteCache';
import cd from './cd';
import CdError from './shared/CdError';
import { defined, removeDoubleSpaces, sleep, unique } from './shared/utils-general';
import { handleApiReject } from './utils-api';

/**
 * @typedef {import('./AutocompleteManager').AutocompleteType} AutocompleteType
 */

/**
 * @typedef {import('./AutocompleteManager').AutocompleteConfigShared} AutocompleteConfigShared
 */

/**
 * @typedef {import('./AutocompleteTypes').Item} Item
 */

/**
 * @template {any} [T=any]
 * @typedef {object} Value
 * @property {string} [key]
 * @property {T} item
 * @property {(() => import('./tribute/Tribute').InsertData) | undefined} [transform]
 */

/**
 * @typedef {object} PerformanceMetrics
 * @property {string} type
 * @property {import('./AutocompleteCache').CacheStats & { memoryUsage: number }} cache
 * @property {number} defaultItemsCount
 * @property {number} lastResultsCount
 * @property {string} lastQuery
 */

/**
 * Abstract base class for all autocomplete types. Provides shared functionality for caching,
 * validation, result processing, and API request handling.
 *
 * @abstract
 */
class BaseAutocomplete {
  /**
   * Advanced cache for storing API results by query text.
   *
   * @type {AutocompleteCache}
   */
  cache;

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
   * @param {AutocompleteConfigShared} [config] Configuration options
   */
  constructor(config = {}) {
    Object.assign(this, config);

    // Initialize advanced cache if not provided
    if (!this.cache || !(this.cache instanceof AutocompleteCache)) {
      this.cache = new AutocompleteCache({
        maxSize: /** @type {any} */ (config).cacheMaxSize || 500,
        ttl: /** @type {any} */ (config).cacheTtl || 5 * 60 * 1000, // 5 minutes
        maxMemory: /** @type {any} */ (config).cacheMaxMemory || 5 * 1024 * 1024, // 5MB
      });
    }
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
   * @param {any} _item The item to transform
   * @returns {import('./tribute/Tribute').InsertData}
   */
  transformItemToInsertData(_item) {
    throw new CdError({
      type: 'internal',
      message: 'transformItemToInsertData() must be implemented by subclass',
    });
  }

  /**
   * Validate input text for this autocomplete type.
   *
   * @abstract
   * @param {string} _text The input text to validate
   * @returns {boolean} Whether the input is valid
   */
  validateInput(_text) {
    throw new CdError({
      type: 'internal',
      message: 'validateInput() must be implemented by subclass',
    });
  }

  /**
   * Make an API request to get autocomplete suggestions.
   *
   * @abstract
   * @param {string} _text The search text
   * @returns {Promise<string[]>} Promise resolving to array of suggestions
   */
  makeApiRequest(_text) {
    throw new CdError({
      type: 'internal',
      message: 'makeApiRequest() must be implemented by subclass',
    });
  }

  /**
   * Get autocomplete values for the given text. This is the main method called by Tribute.
   *
   * @param {string} text The search text
   * @param {(values: any[]) => void} callback Callback function to call with results
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
      callback(this.processResults(cachedResults, /** @type {any} */ (this)));

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

    callback(this.processResults(values, /** @type {any} */ (this)));

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
        callback(this.processResults(apiResults, /** @type {any} */ (this)));
      } catch (error) {
        // Silently handle API errors to avoid disrupting user experience
        console.warn('Autocomplete API request failed:', error);
      }
    }
  }

  /**
   * Process raw results into Value objects for Tribute.
   *
   * @param {Item[]} items Raw items to process
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
    return this.cache.get(text);
  }

  /**
   * Update cache with new results.
   *
   * @param {string} text Search text
   * @param {string[]} results Results to cache
   */
  updateCache(text, results) {
    this.cache.set(text, results);
  }

  /**
   * Get default items, using lazy loading if available.
   *
   * @returns {any[]} Default items
   */
  getDefaultItems() {
    if ((!this.default || this.default.length === 0) && this.defaultLazy) {
      this.default = this.defaultLazy();
    }

    return this.default || [];
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   * Subclasses can override this to provide type-specific properties.
   *
   * @returns {Partial<import('./tribute/Tribute').TributeCollection>} Collection properties
   */
  getCollectionProperties() {
    return {};
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
   * @param {AsyncPromiseExecutor<void>} executor Promise executor function
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
   * @param {import('types-mediawiki/api_params').UnknownApiParams} params API parameters
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

      if (this.currentPromise) {
        this.promiseIsNotSuperseded(this.currentPromise);
      }
      resolve(response);
    });
  }

  /**
   * Get performance metrics for this autocomplete instance.
   *
   * @returns {PerformanceMetrics} Performance metrics
   */
  getPerformanceMetrics() {
    const cacheStats = this.cache.getStats();

    return {
      type: this.constructor.name,
      cache: cacheStats,
      defaultItemsCount: this.getDefaultItems().length,
      lastResultsCount: this.lastResults.length,
      lastQuery: this.lastQuery,
    };
  }

  /**
   * Optimize cache by removing least used entries.
   */
  optimizeCache() {
    // The AutocompleteCache handles optimization automatically, but we can trigger manual cleanup
    // if needed
    this.cache.cleanup();
  }

  /**
   * Prefetch data for common queries to improve performance.
   *
   * @param {string[]} commonQueries Array of common query strings
   * @returns {Promise<void>}
   */
  async prefetchCommonQueries(commonQueries) {
    await this.cache.prefetch(commonQueries, async (query) => {
      if (this.validateInput(query)) {
        return await this.makeApiRequest(query);
      }

      return [];
    });
  }

  /**
   * Destroy the autocomplete instance and clean up resources.
   */
  destroy() {
    this.cache.destroy();
  }
}

export default BaseAutocomplete;
