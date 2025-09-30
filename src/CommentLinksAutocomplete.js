import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import sectionRegistry from './sectionRegistry';
import { defined, removeDoubleSpaces, underlinesToSpaces, unique } from './shared/utils-general';

/**
 * @typedef {object} CommentLinksItem
 * @property {string} key
 * @property {string} urlFragment
 * @property {string} [authorName]
 * @property {string} [timestamp]
 * @property {string} [headline]
 */

/**
 * Autocomplete class for comment and section links. Handles [[# trigger for linking to comments
 * and sections on the current page.
 */
class CommentLinksAutocomplete extends BaseAutocomplete {
  /**
   * Create a CommentLinksAutocomplete instance.
   *
   * @param {object} [config] Configuration object
   * @param {import('./Comment').default[]} [config.comments] List of comments for autocomplete
   */
  constructor(config = {}) {
    // Set default configuration for comment links
    const defaultConfig = {
      default: undefined,
      defaultLazy: () => this.generateCommentLinksData(),
      transformItemToInsertData: CommentLinksAutocomplete.prototype.transformItemToInsertData,
    };

    super({ ...defaultConfig, ...config });
  }

  /**
   * Static configuration for comment links autocomplete.
   *
   * @returns {import('./Autocomplete').AutocompleteConfigShared}
   * @static
   */
  static getConfig() {
    return {
      default: undefined,
    };
  }

  /**
   * Transform a comment links item into insert data for Tribute.
   *
   * @param {CommentLinksItem} item The comment links item to transform
   * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
   * @static
   */
  static transformItemToInsertData(item) {
    return {
      start: `[[#${item.urlFragment}|`,
      end: ']]',
      content:
        'timestamp' in item
          ? cd.s('cf-autocomplete-commentlinks-text', item.authorName, item.timestamp)
          : /** @type {string} */ (item.headline),
    };
  }

  /**
   * Get the display label for comment links autocomplete.
   *
   * @override
   * @returns {string}
   */
  getLabel() {
    return cd.s('cf-autocomplete-commentlinks-label');
  }

  /**
   * Get the trigger string for comment links autocomplete.
   *
   * @override
   * @returns {string}
   */
  getTrigger() {
    return '[[#';
  }

  /**
   * Transform a comment links item into insert data for Tribute.
   * This method can be called directly with an item parameter or as a bound method where `this.item` contains the comment links item.
   *
   * @override
   * @param {CommentLinksItem} [item] The comment links item to transform (optional if called as bound method)
   * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
   */
  transformItemToInsertData(item) {
    // Support both direct calls (with parameter) and bound calls (using this.item)
    const actualItem = item === undefined ? this.item : item;

    return CommentLinksAutocomplete.transformItemToInsertData(actualItem);
  }

  /**
   * Validate input text for comment links autocomplete.
   *
   * @override
   * @param {string} text The input text to validate
   * @returns {boolean} Whether the input is valid
   */
  validateInput(text) {
    // Comment links don't use API requests, so always return false
    return false;
  }

  /**
   * Make an API request for comment links. This is not used since comment links
   * are generated from local data only.
   *
   * @override
   * @param {string} text The search text
   * @returns {Promise<string[]>} Empty array since no API requests are made
   */
  makeApiRequest(text) {
    return [];
  }

  /**
   * Get autocomplete values for comment links. Overrides the base implementation
   * to use Tribute's search functionality for filtering.
   *
   * @override
   * @param {string} text The search text
   * @param {Function} callback Callback function to call with results
   * @returns {Promise<void>}
   */
  getValues(text, callback) {
    // Ensure default items are loaded
    if (!this.default || this.default.length === 0) {
      this.default = this.getDefaultItems();
    }

    text = removeDoubleSpaces(text);

    // Validate input - reject if contains forbidden characters
    if (/[#<>[\]|{}]/.test(text)) {
      callback([]);

      return;
    }

    // Use Tribute's built-in search functionality to filter results
    // This mimics the original implementation's behavior
    const matches = this.filterCommentLinks(text, this.default);

    callback(this.processResults(matches, this));
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @returns {object} Collection properties
   */
  getCollectionProperties() {
    return {
      keepAsEnd: /^\]\]/,
    };
  }

  /**
   * Filter comment links using Tribute's search algorithm.
   * This replicates the original Tribute search behavior.
   *
   * @param {string} text Search text
   * @param {CommentLinksItem[]} items Items to search through
   * @returns {CommentLinksItem[]} Filtered results
   * @private
   */
  filterCommentLinks(text, items) {
    if (!text) {
      return items.slice(0, 10); // Limit to 10 results like original
    }

    const searchRegex = new RegExp(mw.util.escapeRegExp(text), 'i');

    return items
      .filter((item) => searchRegex.test(item.key))
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Generate comment links data from comments and sections.
   * This replicates the original defaultLazy functionality.
   *
   * @returns {CommentLinksItem[]} Array of comment and section link items
   * @private
   */
  generateCommentLinksData() {
    const comments = /** @type {import('./Comment').default[]} */ (this.data.comments || []);

    // Process comments into comment link items
    const commentItems = comments.reduce((acc, comment) => {
      const urlFragment = comment.getUrlFragment();
      if (!urlFragment) {
        return acc;
      }

      const authorName = comment.author.getName();
      const timestamp = comment.timestamp;

      // Generate comment snippet
      let snippet;
      const snippetMaxLength = 80;
      if (comment.getText().length > snippetMaxLength) {
        snippet = comment.getText().slice(0, snippetMaxLength);
        const spacePos = snippet.lastIndexOf(
          cd.mws('word-separator', { language: 'content' })
        );
        if (spacePos !== -1) {
          snippet = snippet.slice(0, spacePos);
          if (/[.…,;!?:-—–]/.test(snippet[snippet.length - 1])) {
            snippet += ' ';
          }
          snippet += cd.s('ellipsis');
        }
      } else {
        snippet = comment.getText();
      }

      // Build display key
      let authorTimestamp = authorName;
      if (timestamp) {
        authorTimestamp += cd.mws('comma-separator', { language: 'content' }) + timestamp;
      }

      acc.push({
        key: authorTimestamp + cd.mws('colon-separator', { language: 'content' }) + snippet,
        urlFragment,
        authorName,
        timestamp,
      });

      return acc;
    }, /** @type {CommentLinksItem[]} */ ([]));

    // Process sections into section link items
    const sectionItems = sectionRegistry.getAll().reduce((acc, section) => {
      acc.push({
        key: underlinesToSpaces(section.id),
        urlFragment: underlinesToSpaces(section.id),
        headline: section.headline,
      });

      return acc;
    }, /** @type {CommentLinksItem[]} */ ([]));

    return commentItems.concat(sectionItems);
  }
}

export default CommentLinksAutocomplete;
