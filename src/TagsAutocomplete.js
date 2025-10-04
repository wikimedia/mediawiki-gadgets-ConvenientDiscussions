import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import { ensureArray } from './shared/utils-general';

/**
 * @typedef {string | [string, string, string?]} TagItem
 */

/**
 * Autocomplete class for HTML tags. Handles both simple tags and complex tag structures
 * with parameters.
 */
class TagsAutocomplete extends BaseAutocomplete {
  /**
   * Create a TagsAutocomplete instance.
   *
   * @param {import('./AutocompleteManager').AutocompleteConfigShared} [config] Configuration
   *   options
   */
  constructor(config = {}) {
    super(config);
  }

  /**
   * Transform a tag item into insert data for the Tribute library.
   *
   * @param {TagItem} item The tag item to transform
   * @returns {import('./tribute/Tribute').InsertData}
   */
  static transformItemToInsertData(item) {
    return {
      start: Array.isArray(item) ? item[1] : `<${item}>`,
      end: Array.isArray(item) ? item[2] : `</${item}>`,
      selectContent: true,
    };
  }

  /**
   * Create the default lazy loading function for tags.
   *
   * @returns {TagItem[]} The default tag items
   * @override
   */
  defaultLazy = () => {
    /** @type {TagItem[]} */
    const tagAdditions = [
      // An element can be an array of a string to display and strings to insert before and after
      // the caret.
      ['br', '<br>'],

      // Use .concat() because otherwise the closing </nowiki> would get onto the wiki page and have
      // undesirable effects
      ['codenowiki', '<code><nowiki>', '</'.concat('nowiki></code>')],

      ['hr', '<hr>'],
      ['wbr', '<wbr>'],
      ['gallery', '<gallery>\n', '\n</gallery>'],
      ['references', '<references />'],
      ['section', '<section />'],
      ['syntaxhighlight lang=""', '<syntaxhighlight lang="', '">\n\n</syntaxhighlight>'],
      [
        'syntaxhighlight inline lang=""',
        '<syntaxhighlight inline lang="',
        '"></syntaxhighlight>',
      ],
      ['syntaxhighlight', '<syntaxhighlight>\n', '\n</syntaxhighlight>'],
      ['templatestyles', '<templatestyles src="', '" />'],
    ];

    return /** @type {Array<TagItem>} */ (cd.g.allowedTags)
      .filter((tagString) => !tagAdditions.some((tagArray) => tagArray[0] === tagString))
      .concat(tagAdditions)
      .sort((item1, item2) => ensureArray(item1)[0] > ensureArray(item2)[0] ? 1 : -1);
  };

  /**
   * Get the display label for tags autocomplete.
   *
   * @override
   * @returns {string}
   */
  getLabel() {
    return cd.s('cf-autocomplete-tags-label');
  }

  /**
   * Get the trigger character for tags autocomplete.
   *
   * @override
   * @returns {string}
   */
  getTrigger() {
    return '<';
  }

  /**
   * Validate input text for tags autocomplete.
   *
   * @override
   * @param {string} text The input text to validate
   * @returns {boolean} Whether the input is valid
   */
  validateInput(text) {
    // Tags autocomplete only works with alphabetic characters
    return Boolean(text && /^[a-z]+$/i.test(text));
  }

  /**
   * Tags autocomplete doesn't make API requests - it only uses predefined lists.
   *
   * @override
   * @param {string} _text The search text (unused)
   * @returns {Promise<string[]>} Empty array since no API requests are made
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async makeApiRequest(_text) {
    return [];
  }

  /**
   * Get autocomplete values for the given text.
   *
   * @override
   * @param {string} text The search text
   * @param {(values: import('./BaseAutocomplete').Result[]) => void} callback Callback function to
   *   call with results
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getValues(text, callback) {
    // Initialize default items if not already done
    if (this.default.length === 0) {
      this.default = this.getDefaultItems();
    }

    // Validate input
    if (!this.validateInput(text)) {
      callback([]);

      return;
    }

    // Filter tags that start with the input text
    const regexp = new RegExp('^' + mw.util.escapeRegExp(text), 'i');

    callback(
      this.getResultsFromItems(
        this.default.filter((tag) => regexp.test(Array.isArray(tag) ? tag[0] : tag))
      )
    );
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @override
   * @returns {Partial<import('./tribute/Tribute').TributeCollection>} Collection properties
   */
  getCollectionProperties() {
    return {
      keepAsEnd: /^>/,
      replaceEnd: false,
    };
  }
}

export default TagsAutocomplete;
