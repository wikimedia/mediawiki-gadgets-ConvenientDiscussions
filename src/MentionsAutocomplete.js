import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import { defined, removeDoubleSpaces, ucFirst } from './shared/utils-general';
import userRegistry from './userRegistry';
import { handleApiReject } from './utils-api';

/**
 * Autocomplete class for user mentions. Handles `@`-triggered autocomplete for user names,
 * including both registered and unregistered users.
 */
class MentionsAutocomplete extends BaseAutocomplete {
  /**
   * Create a mentions autocomplete instance.
   *
   * @param {import('./AutocompleteManager').AutocompleteConfigShared} [config] Configuration options
   */
  constructor(config = {}) {
    // Set default configuration for mentions
    const defaultConfig = {
      default: [],
      transformItemToInsertData: MentionsAutocomplete.prototype.transformItemToInsertData,
    };

    super({ ...defaultConfig, ...config });
  }

  /**
   * Static configuration for mentions autocomplete.
   *
   * @returns {import('./AutocompleteManager').AutocompleteConfigShared}
   * @static
   */
  static getConfig() {
    return {
      default: [],
    };
  }

  /**
   * Transform a user name item into insert data for the Tribute library.
   *
   * @param {string} item The user name to transform
   * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
   * @static
   */
  static transformItemToInsertData(item) {
    const name = item.trim();
    const user = userRegistry.get(name);
    const userNamespace = user.getNamespaceAlias();
    const pageName = user.isRegistered()
      ? `${userNamespace}:${name}`
      : `${cd.g.contribsPages[0]}/${name}`;

    return {
      start: `@[[${pageName}|`,
      end: name.match(/[(,]/) ? `${name}]]` : ']]',
      content: name,
      omitContentCheck() {
        return !this.start.includes('/');
      },
      cmdModify() {
        this.end += cd.mws('colon-separator', { language: 'content' });
      },
    };
  }

  /**
   * Get the display label for mentions autocomplete.
   *
   * @override
   * @returns {string}
   */
  getLabel() {
    return cd.s('cf-autocomplete-mentions-label');
  }

  /**
   * Get the trigger character for mentions autocomplete.
   *
   * @override
   * @returns {string}
   */
  getTrigger() {
    return cd.config.mentionCharacter;
  }

  /**
   * Transform a user name item into insert data for the Tribute library.
   * This method can be called directly with an item parameter or as a bound method where `this.item` contains the user name.
   *
   * @override
   * @param {string} [item] The user name to transform (optional if called as bound method)
   * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
   */
  transformItemToInsertData(item) {
    // Support both direct calls (with parameter) and bound calls (using this.item)

    return MentionsAutocomplete.transformItemToInsertData(item === undefined ? this.item : item);
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @override
   * @returns {Partial<import('./tribute/Tribute').TributeCollection>} Collection properties
   */
  getCollectionProperties() {
    return {
      requireLeadingSpace: cd.config.mentionRequiresLeadingSpace,
    };
  }

  /**
   * Validate input text for mentions autocomplete.
   *
   * @override
   * @param {string} text The input text to validate
   * @returns {boolean} Whether the input is valid for making API requests
   */
  validateInput(text) {
    return Boolean(
      text &&
      text.length <= 85 &&
      !/[#<>[\]|{}/@:]/.test(text) &&

      // 5 spaces in a user name seem too many. "Jack who built the house" has 4 :-)
      (text.match(new RegExp(cd.mws('word-separator', { language: 'content' }), 'g')) || []).length <= 4
    );
  }

  /**
   * Make an API request to get relevant user names.
   *
   * @override
   * @param {string} text The search text
   * @returns {Promise<string[]>} Promise resolving to array of user names
   */
  async makeApiRequest(text) {
    text = ucFirst(text);

    return BaseAutocomplete.createDelayedPromise(async (resolve) => {
      // First, try to use the search to get only users that have talk pages. Most legitimate
      // users do, while spammers don't.
      const response = await BaseAutocomplete.makeOpenSearchRequest({
        search: text,
        namespace: 3,
        redirects: 'resolve',
      });

      const users = response[1]
        .map((name) => (name.match(cd.g.userNamespacesRegexp) || [])[1])
        .filter(defined)
        .filter((name) => !name.includes('/'));

      if (users.length) {
        resolve(users);
      } else {
        // If we didn't succeed with search, try the entire users database.
        /** @type {ApiResponseQuery<ApiResponseQueryContentAllUsers>} */
        const allUsersResponse = await cd
          .getApi(BaseAutocomplete.apiConfig)
          .get({
            action: 'query',
            list: 'allusers',
            auprefix: text,
          })
          .catch(handleApiReject);

        if (BaseAutocomplete.currentPromise) {
          BaseAutocomplete.promiseIsNotSuperseded(BaseAutocomplete.currentPromise);
        }

        if (!allUsersResponse.query) {
          throw new Error('No query data in response');
        }

        resolve(allUsersResponse.query.allusers.map((/** @type {{ name: string }} */ user) => user.name));
      }
    });
  }

  /**
   * Get autocomplete values for the given text. Overrides base implementation to handle
   * mentions-specific logic and trigger validation.
   *
   * @override
   * @param {string} text The search text
   * @param {(values: import('./BaseAutocomplete').Result[]) => void} callback Callback function to call with results
   * @returns {Promise<void>}
   */
  async getValues(text, callback) {
    text = removeDoubleSpaces(text);

    // Reset results if query doesn't start with last query
    if (this.lastQuery && !text.startsWith(this.lastQuery)) {
      this.lastResults = [];
    }
    this.lastQuery = text;

    // Create config object for processResults
    const config = {
      transformItemToInsertData: this.transformItemToInsertData.bind(this),
    };

    // Check cache first
    const cachedResults = this.handleCache(text);
    if (cachedResults) {
      callback(this.processResults(cachedResults, config));

      return;
    }

    // Get local matches from default user names
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

    callback(this.processResults(values, config));

    // Make API request if needed and no local matches
    if (shouldMakeRequest && !localMatches.length) {
      try {
        const apiResults = await this.makeApiRequest(text);

        // Check if request is still current and trigger is still mentions
        if (this.lastQuery !== text) return;

        this.lastResults = apiResults.slice();

        // Add user-typed text as last option
        const trimmedText = text.trim();
        if (trimmedText) {
          apiResults.push(trimmedText);
        }

        this.updateCache(text, apiResults);
        callback(this.processResults(apiResults, config));
      } catch (error) {
        // Silently handle API errors to avoid disrupting user experience
        console.warn('Mentions autocomplete API request failed:', error);
      }
    }
  }
}

export default MentionsAutocomplete;
