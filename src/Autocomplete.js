import AutocompleteManager from './AutocompleteManager';
import cd from './cd';
import sectionRegistry from './sectionRegistry';
import { underlinesToSpaces } from './shared/utils-general';
import userRegistry from './userRegistry';

/**
 * @typedef {'mentions' | 'commentLinks' | 'wikilinks' | 'templates' | 'tags'} AutocompleteType
 */

/** @typedef {[string, string[], string[], string[]]} OpenSearchResults */

/**
 * @typedef {NonNullable<typeof Autocomplete.configs>} AutocompleteStaticConfig
 */

/**
 * @typedef {object} ItemByCollection
 * @property {string} mentions
 * @property {CommentLinksItem} commentLinks
 * @property {string} wikilinks
 * @property {string} templates
 * @property {TagsItem} tags
 */

/**
 * @typedef {object} CommentLinksItem
 * @property {string} key
 * @property {string} urlFragment
 * @property {string} [authorName]
 * @property {string} [timestamp]
 * @property {string} [headline]
 */

/**
 * @typedef {string | [string, string, string?]} TagsItem
 */

/**
 * @typedef {object} AutocompleteConfigShared
 * @property {StringArraysByKey} [cache] Results by query
 * @property {string[]} [lastResults] Results of last query
 * @property {string} [lastQuery] Last query
 * @property {import('./AutocompleteTypes').Item[]} [default] Default set of items to search across
 *   (may be more narrow than the list of all potential values, as in the case of user names)
 * @property {(() => import('./AutocompleteTypes').Item[])} [defaultLazy] Function for lazy loading
 *   of the defaults
 * @property {() => import('./tribute/Tribute').InsertData} [transformItemToInsertData] Function
 *   that transforms the item into the data that is actually inserted
 * @property {AnyByKey} [data] Any additional data to be used by methods
 */

/**
 * @typedef {{ [key in AutocompleteType]: AutocompleteConfigShared }} AutocompleteConfigs
 */

/**
 * Backward compatibility wrapper for AutocompleteManager.
 * This class extends AutocompleteManager to maintain the existing API.
 */
class Autocomplete extends AutocompleteManager {
  static {
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

    /**
     * Autocomplete configurations for every type.
     */
    this.configs = /** @satisfies {AutocompleteConfigs} */ ({
      mentions: {
        cache: {},
        /** @type {string[]} */
        lastResults: [],
        /** @type {string[]} */
        default: [],

        /**
         * @this {import('./BaseAutocomplete').Result<string>}
         * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
         */
        transformItemToInsertData() {
          const name = this.item.trim();
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
        },
      },

      commentLinks: {
        default: /** @type {CommentLinksItem[]|undefined} */ (undefined),

        // Lazy initialization, because getText() takes time
        defaultLazy() {
          return /** @type {{ comments: import('./Comment').default[] }} */ (this.data).comments
            .reduce((acc, comment) => {
              const urlFragment = comment.getUrlFragment();
              if (!urlFragment) {
                return acc;
              }

              const authorName = comment.author.getName();
              const timestamp = comment.timestamp;
              /** @type {string} */
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
            }, /** @type {CommentLinksItem[]} */([]))
            .concat(
              sectionRegistry.getAll().reduce((acc, section) => {
                acc.push({
                  key: underlinesToSpaces(section.id),
                  urlFragment: underlinesToSpaces(section.id),
                  headline: section.headline,
                });

                return acc;
              }, /** @type {CommentLinksItem[]} */([]))
            );
        },

        /**
         * @this {import('./BaseAutocomplete').Result<CommentLinksItem>}
         * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
         */
        transformItemToInsertData() {
          const object = this.item;

          return {
            start: `[[#${object.urlFragment}|`,
            end: ']]',
            content:
              'timestamp' in object
                ? cd.s('cf-autocomplete-commentlinks-text', object.authorName, object.timestamp)
                : /** @type {string} */ (object.headline),
          };
        },
      },

      wikilinks: {
        cache: {},
        /** @type {string[]} */
        lastResults: [],

        /**
         * @this {import('./BaseAutocomplete').Result<string>}
         * @returns {import('./tribute/Tribute').InsertData & { end: string }}
         */
        transformItemToInsertData() {
          return {
            start: '[[' + /** @type {string} */ (this.item).trim(),
            end: ']]',
            shiftModify() {
              this.content = this.start.slice(2);
              this.start += '|';
            },
          };
        },
      },

      templates: {
        cache: {},
        /** @type {string[]} */
        lastResults: [],

        /**
         * @this {import('./BaseAutocomplete').Result<string>}
         * @returns {import('./tribute/Tribute').InsertData & { end: string }}
         */
        transformItemToInsertData() {
          return {
            start: '{{' + /** @type {string} */ (this.item).trim(),
            end: '}}',
            shiftModify() {
              this.start += '|';
            },
          };
        },
      },

      tags: {
        defaultLazy: () =>
          /** @type {any[]} */(cd.g.allowedTags)
            .filter((tagString) => !tagAdditions.some((tagArray) => tagArray[0] === tagString))
            .concat(tagAdditions)
            .sort((item1, item2) =>
              (
                (typeof item1 === 'string' ? item1 : item1[0]) >
                (typeof item2 === 'string' ? item2 : item2[0])
              )
                ? 1
                : -1
            ),

        /** @type {any[] | undefined} */
        default: undefined,

        /**
         * @this {import('./BaseAutocomplete').Result<TagsItem>}
         * @returns {import('./tribute/Tribute').InsertData}
         */
        transformItemToInsertData() {
          const item = this.item;

          return {
            start: Array.isArray(item) ? item[1] : `<${item}>`,
            end: Array.isArray(item) ? item[2] : `</${item}>`,
            selectContent: true,
          };
        },
      },
    });
  }

  // Delegate static methods to AutocompleteManager for backward compatibility

  /**
   * @override
   * @returns {number}
   */
  static get delay() {
    return AutocompleteManager.delay;
  }

  /**
   * @override
   * @returns {{ ajax: { timeout: number } }}
   */
  static get apiConfig() {
    return AutocompleteManager.apiConfig;
  }

  /**
   * @override
   * @returns {HTMLElement|undefined}
   */
  static get activeMenu() {
    return AutocompleteManager.activeMenu;
  }

  /**
   * @override
   * @param {HTMLElement|undefined} value
   */
  static set activeMenu(value) {
    AutocompleteManager.activeMenu = value;
  }

  /**
   * @override
   * @returns {Promise<any> | undefined}
   */
  static get currentPromise() {
    return AutocompleteManager.currentPromise;
  }

  /**
   * @override
   * @param {Promise<any> | undefined} value
   */
  static set currentPromise(value) {
    AutocompleteManager.currentPromise = value;
  }

  /**
   * @override
   * @returns {Element|undefined}
   */
  static getActiveMenu() {
    return AutocompleteManager.getActiveMenu();
  }

  /**
   * @override
   * @param {Promise<any>} promise
   * @returns {void}
   */
  static promiseIsNotSuperseded(promise) {
    AutocompleteManager.promiseIsNotSuperseded(promise);
  }

  /**
   * @override
   * @param {string} text
   * @returns {Promise<string[]>}
   */
  static getRelevantUserNames(text) {
    return AutocompleteManager.getRelevantUserNames(text);
  }

  /**
   * @override
   * @param {string} result
   * @param {string} query
   * @returns {string}
   */
  static useOriginalFirstCharCase(result, query) {
    return AutocompleteManager.useOriginalFirstCharCase(result, query);
  }

  /**
   * @override
   * @param {string} text
   * @returns {Promise<string[]>}
   */
  static getRelevantPageNames(text) {
    return AutocompleteManager.getRelevantPageNames(text);
  }

  /**
   * @override
   * @param {string} text
   * @returns {Promise<string[]>}
   */
  static getRelevantTemplateNames(text) {
    return AutocompleteManager.getRelevantTemplateNames(text);
  }

  /**
   * @override
   * @param {string} string
   * @param {string[]} list
   * @returns {string[]}
   */
  static search(string, list) {
    return AutocompleteManager.search(string, list);
  }
}

// Static configurations for backward compatibility
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

/**
 * Autocomplete configurations for every type.
 */
Autocomplete.configs = /** @satisfies {AutocompleteConfigs} */ ({
  mentions: {
    cache: {},
    /** @type {string[]} */
    lastResults: [],
    /** @type {string[]} */
    default: [],

    /**
     * @this {import('./BaseAutocomplete').Result<string>}
     * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
     */
    transformItemToInsertData() {
      const name = this.item.trim();
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
    },
  },

  commentLinks: {
    default: /** @type {CommentLinksItem[]|undefined} */ (undefined),

    // Lazy initialization, because getText() takes time
    defaultLazy() {
      return /** @type {{ comments: import('./Comment').default[] }} */ (this.data).comments
        .reduce((acc, comment) => {
          const urlFragment = comment.getUrlFragment();
          if (!urlFragment) {
            return acc;
          }

          const authorName = comment.author.getName();
          const timestamp = comment.timestamp;
          /** @type {string} */
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
        }, /** @type {CommentLinksItem[]} */([]))
        .concat(
          sectionRegistry.getAll().reduce((acc, section) => {
            acc.push({
              key: underlinesToSpaces(section.id),
              urlFragment: underlinesToSpaces(section.id),
              headline: section.headline,
            });

            return acc;
          }, /** @type {CommentLinksItem[]} */([]))
        );
    },

    /**
     * @this {import('./BaseAutocomplete').Result<CommentLinksItem>}
     * @returns {import('./tribute/Tribute').InsertData & { end: string, content: string }}
     */
    transformItemToInsertData() {
      const object = this.item;

      return {
        start: `[[#${object.urlFragment}|`,
        end: ']]',
        content:
          'timestamp' in object
            ? cd.s('cf-autocomplete-commentlinks-text', object.authorName, object.timestamp)
            : /** @type {string} */ (object.headline),
      };
    },
  },

  wikilinks: {
    cache: {},
    /** @type {string[]} */
    lastResults: [],

    /**
     * @this {import('./BaseAutocomplete').Result<string>}
     * @returns {import('./tribute/Tribute').InsertData & { end: string }}
     */
    transformItemToInsertData() {
      return {
        start: '[[' + /** @type {string} */ (this.item).trim(),
        end: ']]',
        shiftModify() {
          this.content = this.start.slice(2);
          this.start += '|';
        },
      };
    },
  },

  templates: {
    cache: {},
    /** @type {string[]} */
    lastResults: [],

    /**
     * @this {import('./BaseAutocomplete').Result<string>}
     * @returns {import('./tribute/Tribute').InsertData & { end: string }}
     */
    transformItemToInsertData() {
      return {
        start: '{{' + /** @type {string} */ (this.item).trim(),
        end: '}}',
        shiftModify() {
          this.start += '|';
        },
      };
    },
  },

  tags: {
    defaultLazy: () =>
      /** @type {any[]} */(cd.g.allowedTags)
        .filter((tagString) => !tagAdditions.some((tagArray) => tagArray[0] === tagString))
        .concat(tagAdditions)
        .sort((item1, item2) =>
          (
            (typeof item1 === 'string' ? item1 : item1[0]) >
            (typeof item2 === 'string' ? item2 : item2[0])
          )
            ? 1
            : -1
        ),

    /** @type {any[] | undefined} */
    default: undefined,

    /**
     * @this {import('./BaseAutocomplete').Result<TagsItem>}
     * @returns {import('./tribute/Tribute').InsertData}
     */
    transformItemToInsertData() {
      const item = this.item;

      return {
        start: Array.isArray(item) ? item[1] : `<${item}>`,
        end: Array.isArray(item) ? item[2] : `</${item}>`,
        selectContent: true,
      };
    },
  },
});

export default Autocomplete;
