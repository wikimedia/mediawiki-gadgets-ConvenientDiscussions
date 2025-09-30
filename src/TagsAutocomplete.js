import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';

/**
 * @typedef {string | [string, string, string?]} TagsItem
 */

/**
 * Autocomplete class for HTML tags. Handles both simple tags and complex tag structures
 * with parameters.
 */
class TagsAutocomplete extends BaseAutocomplete {
  /**
   * Create a TagsAutocomplete instance.
   *
   * @param {import('./Autocomplete').AutocompleteConfigShared} [config] Configuration options
   */
  constructor(config = {}) {
    // Set default configuration for tags
    const defaultConfig = {
      default: undefined,
      defaultLazy: TagsAutocomplete.createDefaultLazy,
      transformItemToInsertData: TagsAutocomplete.prototype.transformItemToInsertData,
    };

    super({ ...defaultConfig, ...config });
  }

  /**
   * Static configuration for tags autocomplete.
   *
   * @returns {import('./Autocomplete').AutocompleteConfigShared}
   * @static
   */
  static getConfig() {
    return {
      default: undefined,
      defaultLazy: TagsAutocomplete.createDefaultLazy,
    };
  }

  /**
   * Transform a tag item into insert data for the Tribute library.
   *
   * @param {TagsItem} item The tag item to transform
   * @returns {import('./tribute/Tribute').InsertData}
   * @static
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
   * @returns {TagsItem[]} The default tag items
   * @static
   */
  static createDefaultLazy() {
    /** @type {TagsItem[]} */
    const tagAdditions = [
      // An element can be an array of a string to display and strings to insert before and after
      // the caret.
      ['br', '<br>'],
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

    return /** @type {Array<TagsItem>} */ (cd.g.allowedTags)
      .filter((tagString) => !tagAdditions.some((tagArray) => tagArray[0] === tagString))
      .concat(tagAdditions)
      .sort((item1, item2) =>
        (
          (typeof item1 === 'string' ? item1 : item1[0]) >
          (typeof item2 === 'string' ? item2 : item2[0])
        )
          ? 1
          : -1
      );
  }

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
   * Transform a tag item into insert data for the Tribute library.
   * This method can be called directly with an item parameter or as a bound method where `this.item` contains the tag item.
   *
   * @override
   * @param {TagsItem} [item] The tag item to transform (optional if called as bound method)
   * @returns {import('./tribute/Tribute').InsertData}
   */
  transformItemToInsertData(item) {
    // Support both direct calls (with parameter) and bound calls (using this.item)
    const actualItem = item === undefined ? this.item : item;

    return TagsAutocomplete.transformItemToInsertData(actualItem);
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
  async makeApiRequest(_text) {
    return [];
  }

  /**
   * Get autocomplete values for the given text.
   *
   * @override
   * @param {string} text The search text
   * @param {(values: import('./BaseAutocomplete').Value[]) => void} callback Callback function to call with results
   * @returns {Promise<void>}
   */
  getValues(text, callback) {
    // Initialize default items if not already done
    if ((!this.default || this.default.length === 0) && this.defaultLazy) {
      this.default = this.defaultLazy();
    }

    // Validate input
    if (!this.validateInput(text)) {
      callback([]);

      return;
    }

    // Filter tags that start with the input text
    const regexp = new RegExp('^' + mw.util.escapeRegExp(text), 'i');

    callback(this.processResults(
      (this.default || []).filter((tag) => regexp.test(Array.isArray(tag) ? tag[0] : tag)),
      this
    ));
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @returns {object} Collection properties
   */
  getCollectionProperties() {
    return {
      keepAsEnd: /^>/,
      replaceEnd: false,
    };
  }

  /**
   * Create the default lazy loading function for tags (instance method for backward compatibility).
   *
   * @returns {() => TagsItem[]} Function that returns the default tag items
   */
  createDefaultLazy() {
    return TagsAutocomplete.createDefaultLazy;
  }
}

export default TagsAutocomplete;
