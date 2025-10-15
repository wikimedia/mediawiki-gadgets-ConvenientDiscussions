/**
 * Singleton used to obtain instances of the {@link Page} class while avoiding creating duplicates.
 *
 * @module pageRegistry
 */

import cd from './cd';

/**
 * @exports pageRegistry
 */
const pageRegistry = {
  /**
   * Collection of pages.
   *
   * @type {TypeByKey<import('./Page').default>}
   * @private
   */
  items: {},

  /**
   * @overload
   * @param {string} nameOrMwTitle
   * @param {true} [isGendered]
   * @returns {?import('./Page').default}
   *
   * @overload
   * @param {string|mw.Title} nameOrMwTitle
   * @param {false} [isGendered]
   * @returns {?import('./Page').default}
   */

  /**
   * Get a page object for a page with the specified name (either a new one or already existing).
   *
   * @param {string | mw.Title} nameOrMwTitle
   * @param {boolean} [isGendered] Used to keep the gendered namespace name (`nameOrMwTitle`
   *   should be a string).
   * @returns {?import('./Page').default}
   */
  get(nameOrMwTitle, isGendered = false) {
    const title = nameOrMwTitle instanceof mw.Title
      ? nameOrMwTitle
      : mw.Title.newFromText(nameOrMwTitle);
    if (!title) {
      return null;
    }

    const name = title.getPrefixedText();
    if (!(name in this.items)) {
      this.items[name] = new (
        nameOrMwTitle === cd.g.pageName
          ? require('./CurrentPage').default
          : require('./Page').default
      )(title, isGendered ? /** @type {string} */ (nameOrMwTitle) : undefined);
    } else if (isGendered) {
      // Set the gendered name which could be missing for the page.
      this.items[name].name = /** @type {string} */ (nameOrMwTitle);
    }

    return this.items[name];
  },

  /**
   * Get the page the user is visiting.
   *
   * @returns {import('./CurrentPage').default}
   */
  getCurrent() {
    return /** @type {import('./CurrentPage').default} */ (this.get(cd.g.pageName));
  },
};

export default pageRegistry;
