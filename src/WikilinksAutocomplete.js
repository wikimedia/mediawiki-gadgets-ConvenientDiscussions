import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import { charAt, phpCharToUpper } from './shared/utils-general';
import { handleApiReject } from './utils-api';

/**
 * @typedef {string} WikilinkItem
 */

/**
 * Autocomplete class for wikilinks (page links). Handles page name validation, OpenSearch API
 * integration, colon prefixes, namespace logic, and case sensitivity.
 *
 * @extends BaseAutocomplete
 */
class WikilinksAutocomplete extends BaseAutocomplete {
  /**
   * Create a WikilinksAutocomplete instance.
   *
   * @param {import('./AutocompleteManager').AutocompleteConfigShared} [config] Configuration
   *   options
   */
  constructor(config = {}) {
    super(config);
  }

  /**
   * Transform a page name item into insert data for the Tribute library.
   *
   * @param {string} item The page name to transform
   * @returns {import('./tribute/Tribute').InsertData & { end: string }}
   */
  static transformItemToInsertData(item) {
    return {
      start: '[[' + item.trim(),
      end: ']]',
      shiftModify() {
        this.content = this.start.slice(2);
        this.start += '|';
      },
    };
  }

  /**
   * @override
   * @returns {string}
   */
  getLabel() {
    return cd.s('cf-autocomplete-wikilinks-label');
  }

  /**
   * @override
   * @returns {string}
   */
  getTrigger() {
    return '[[';
  }

  /**
   * @override
   * @param {string} text The input text to validate
   * @returns {boolean} Whether the input is valid for wikilinks
   */
  validateInput(text) {
    const allNssPattern = Object.keys(mw.config.get('wgNamespaceIds')).filter(Boolean).join('|');

    const valid =
      text &&
      text !== ':' &&
      text.length <= 255 &&

      // 10 spaces in a page name seems too many.
      (text.match(new RegExp(cd.mws('word-separator', { language: 'content' }), 'g')) || []).length <= 9 &&

      // Forbidden characters
      !/[#<>[\]|{}]/.test(text) &&

      // Interwikis
      !(
        (text.startsWith(':') || /^[a-z-]\w*:/.test(text)) &&
        !new RegExp(`^:?(?:${allNssPattern}):`, 'i').test(text)
      );

    return Boolean(valid);
  }

  /**
   * @override
   * @param {string} text The search text
   * @returns {Promise<string[]>} Promise resolving to array of page name suggestions
   */
  async makeApiRequest(text) {
    let colonPrefix = false;
    if (cd.g.colonNamespacesPrefixRegexp.test(text)) {
      text = text.slice(1);
      colonPrefix = true;
    }

    return BaseAutocomplete.createDelayedPromise(async (resolve) => {
      const response = /** @type {import('./AutocompleteManager').OpenSearchResults} */ (await cd
        .getApi(BaseAutocomplete.apiConfig)
        .get({
          action: 'opensearch',
          search: text,
          redirects: 'return',
          limit: 10,
        })
        .catch(handleApiReject));

      BaseAutocomplete.promiseIsNotSuperseded(BaseAutocomplete.currentPromise);

      resolve(
        response[1].map((/** @type {string} */ name) => {
          if (mw.config.get('wgCaseSensitiveNamespaces').length) {
            const title = mw.Title.newFromText(name);
            if (
              !title ||
              !mw.config.get('wgCaseSensitiveNamespaces').includes(title.getNamespaceId())
            ) {
              name = this.useOriginalFirstCharCase(name, text);
            }
          } else {
            name = this.useOriginalFirstCharCase(name, text);
          }

          return name.replace(/^/, colonPrefix ? ':' : '');
        })
      );
    });
  }

  /**
   * Transform a page name item into insert data for the Tribute library.
   * This method can be called directly with an item parameter or as a bound method where `this.item` contains the page name.
   *
   * @override
   * @param {string} [item] The page name to transform (optional if called as bound method)
   * @returns {import('./tribute/Tribute').InsertData & { end: string }}
   */
  getInsertDataFromItem(item) {
    // Support both direct calls (with parameter) and bound calls (using this.item)

    return WikilinksAutocomplete.transformItemToInsertData(item === undefined ? this.item : item);
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @override
   * @returns {Partial<import('./tribute/Tribute').TributeCollection>} Collection properties
   */
  getCollectionProperties() {
    return {
      keepAsEnd: /^(?:\||\]\])/,
    };
  }

  /**
   * Use the original first character case from the query in the result.
   *
   * @param {string} result The result from API
   * @param {string} query The original query
   * @returns {string} Result with corrected first character case
   * @private
   */
  useOriginalFirstCharCase(result, query) {
    // But ignore cases with all caps in the first word like ABBA
    const firstWord = result.split(' ')[0];
    if (firstWord.length > 1 && firstWord.toUpperCase() === firstWord) {
      return result;
    }

    const firstChar = charAt(query, 0);
    const firstCharUpperCase = phpCharToUpper(firstChar);

    return result.replace(
      new RegExp(
        // First character pattern
        '^' + (firstCharUpperCase === firstChar
          ? mw.util.escapeRegExp(firstChar)
          : '[' + firstCharUpperCase + firstChar + ']')
      ),
      firstChar
    );
  }
}

export default WikilinksAutocomplete;
