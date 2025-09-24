/**
 * Singleton used to obtain instances of the {@link Page} class while avoiding creating duplicates.
 *
 * @module pageRegistry
 */

import CurrentPage from './CurrentPage';
import Page from './Page';
import cd from './cd';

/**
 * @exports pageRegistry
 */
const pageRegistry = {
  /**
   * Collection of pages.
   *
   * @type {TypeByKey<Page>}
   * @private
   */
  items: {},

  /**
   * @overload
   * @param {string} nameOrMwTitle
   * @param {true} [isGendered=false]
   * @returns {?Page}
   *
   * @overload
   * @param {string|mw.Title} nameOrMwTitle
   * @param {false} [isGendered=false]
   * @returns {?Page}
   */

  /**
   * Get a page object for a page with the specified name (either a new one or already existing).
   *
   * @param {string | mw.Title} nameOrMwTitle
   * @param {boolean} [isGendered] Used to keep the gendered namespace name (`nameOrMwTitle`
   *   should be a string).
   * @returns {?Page}
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
      this.items[name] = new (nameOrMwTitle === cd.g.pageName ? CurrentPage : Page)(
        title,
        isGendered ? /** @type {string} */ (nameOrMwTitle) : undefined
      );
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
