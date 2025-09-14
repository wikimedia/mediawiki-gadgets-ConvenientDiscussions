import CdError from './shared/CdError';

/**
 * @typedef {import('./Autocomplete').AutocompleteType} AutocompleteType
 */

/**
 * @typedef {import('./Autocomplete').AutocompleteConfigShared} AutocompleteConfigShared
 */

/**
 * Factory class for creating appropriate autocomplete instances based on type.
 */
const AutocompleteFactory = {
  /**
   * Create an autocomplete instance of the specified type.
   *
   * @param {AutocompleteType} type The autocomplete type to create
   * @param {AutocompleteConfigShared} [options={}] Configuration options
   * @returns {import('./BaseAutocomplete').default} Autocomplete instance
   * @throws {CdError} If the type is unknown
   */
  create(type, options = {}) {
    switch (type) {
      case 'mentions':
        // Lazy import to avoid circular dependencies
        return new (require('./MentionsAutocomplete').default)(options);
      case 'wikilinks':
        return new (require('./WikilinksAutocomplete').default)(options);
      case 'templates':
        return new (require('./TemplatesAutocomplete').default)(options);
      case 'tags':
        return new (require('./TagsAutocomplete').default)(options);
      case 'commentLinks':
        return new (require('./CommentLinksAutocomplete').default)(options);
      default:
        throw new CdError({
          type: 'internal',
          message: `Unknown autocomplete type: ${type}`,
        });
    }
  },

  /**
   * Get all supported autocomplete types.
   *
   * @returns {AutocompleteType[]} Array of supported types
   */
  getSupportedTypes() {
    return ['mentions', 'wikilinks', 'templates', 'tags', 'commentLinks'];
  },

  /**
   * Check if a type is supported.
   *
   * @param {string} type Type to check
   * @returns {type is AutocompleteType} Whether the type is supported
   */
  isTypeSupported(type) {
    return this.getSupportedTypes().includes(/** @type {AutocompleteType} */ (type));
  },
};

export default AutocompleteFactory;