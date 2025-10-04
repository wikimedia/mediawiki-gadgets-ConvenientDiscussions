import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import sectionRegistry from './sectionRegistry';
import { removeDoubleSpaces, underlinesToSpaces } from './shared/utils-general';

/**
 * @typedef {object} CommentLinkItem
 * @property {string} label
 * @property {string} urlFragment
 * @property {string} [authorName]
 * @property {string} [timestamp]
 * @property {string} [headline]
 */

/**
 * @typedef {object} ConfigExtension
 * @property {object} [config] Configuration object
 * @property {object} [config.data] Configuration object
 * @property {import('./Comment').default[]} [config.data.comments] List of comments for
 *   autocomplete
 */

/**
 * Autocomplete class for comment and section links. Handles [[# trigger for linking to comments
 * and sections on the current page.
 */
class CommentLinksAutocomplete extends BaseAutocomplete {
  /**
   * Create a CommentLinksAutocomplete instance.
   *
   * @param {import('./AutocompleteManager').AutocompleteConfigShared & ConfigExtension} [config]
   *   Configuration object
   */
  constructor(config = {}) {
    super(config);
  }

  /**
   * Transform a comment links item into insert data for Tribute.
   *
   * @param {CommentLinkItem} item The comment links item to transform
   * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
   */
  static getInsertDataFromItem(item) {
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
   * Make an API request for comment links. This is not used since comment links
   * are generated from local data only.
   *
   * @override
   * @param {string} _text The search text
   * @returns {Promise<string[]>} Empty array since no API requests are made
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async makeApiRequest(_text) {
    return [];
  }

  /**
   * Get autocomplete values for comment links. Overrides the base implementation to use Tribute's
   * search functionality for filtering.
   *
   * @override
   * @param {string} text The search text
   * @param {import('./AutocompleteManager').ProcessResults<CommentLinkItem>} callback Callback
   *   function to call with results
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getValues(text, callback) {
    // Initialize default items if not already done
    if (this.default.length === 0) {
      this.default = this.getDefaultItems();
    }

    text = removeDoubleSpaces(text);

    // Validate input - reject if contains forbidden characters
    if (this.validateInput(text)) {
      callback([]);

      return;
    }

    // Use Tribute's built-in search functionality to filter results
    // This mimics the original implementation's behavior
    const matches = this.searchLocal(text, this.default);

    callback(this.getResultsFromItems(matches));
  }
  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @override
   * @returns {Partial<import('./tribute/Tribute').TributeCollection>} Collection properties
   */
  getCollectionProperties() {
    return {
      keepAsEnd: /^\]\]/,
    };
  }

  /**
   * Filter comment links using Tribute's search algorithm. This replicates the original Tribute
   * search behavior.
   *
   * @override
   * @param {string} text Search text
   * @param {CommentLinkItem[]} items Items to search through
   * @returns {CommentLinkItem[]} Filtered results
   * @protected
   */
  searchLocal(text, items) {
    const searchRegex = new RegExp(mw.util.escapeRegExp(text), 'i');

    return items
      .filter((item) => searchRegex.test(item.label));
  }

  /**
   * @override
   */
  defaultLazy = () => this.generateCommentLinksData();

  /**
   * Generate comment links data from comments and sections.
   *
   * @returns {CommentLinkItem[]} Array of comment and section link items
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
        label: authorTimestamp + cd.mws('colon-separator', { language: 'content' }) + snippet,
        urlFragment,
        authorName,
        timestamp,
      });

      return acc;
    }, /** @type {CommentLinkItem[]} */ ([]));

    // Process sections into section link items
    const sectionItems = sectionRegistry.getAll().reduce((acc, section) => {
      acc.push({
        label: underlinesToSpaces(section.id),
        urlFragment: underlinesToSpaces(section.id),
        headline: section.headline,
      });

      return acc;
    }, /** @type {CommentLinkItem[]} */ ([]));

    return commentItems.concat(sectionItems);
  }
}

export default CommentLinksAutocomplete;
