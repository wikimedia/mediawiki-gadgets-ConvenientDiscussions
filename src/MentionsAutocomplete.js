import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import { defined, ucFirst } from './shared/utils-general';
import userRegistry from './userRegistry';
import { handleApiReject } from './utils-api';

/**
 * @typedef {string} MentionItem
 */

/**
 * Autocomplete class for user mentions. Handles `@`-triggered autocomplete for user names,
 * including both registered and unregistered users.
 */
class MentionsAutocomplete extends BaseAutocomplete {
  /**
   * Create a mentions autocomplete instance.
   *
   * @param {import('./AutocompleteManager').AutocompleteConfigShared} [config] Configuration
   *   options
   */
  constructor(config = {}) {
    super(config);
  }

  /**
   * Transform a user name item into insert data for the Tribute library.
   *
   * @param {string} item The user name to transform
   * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
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
      (
        text.match(
          new RegExp(cd.mws('word-separator', { language: 'content' }), 'g')
        ) || []
      ).length <= 4
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
      return users;
    }

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

    return allUsersResponse.query.allusers.map((/** @type {{ name: string }} */ user) => user.name);
  }
}

export default MentionsAutocomplete;
