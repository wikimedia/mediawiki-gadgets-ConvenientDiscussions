import cd from './cd';
import sectionRegistry from './sectionRegistry';
import settings from './settings';
import CdError from './shared/CdError';
import { charAt, defined, phpCharToUpper, removeDoubleSpaces, sleep, ucFirst, underlinesToSpaces, unique } from './shared/utils-general';
import Tribute from './tribute/Tribute';
import userRegistry from './userRegistry';
import { handleApiReject } from './utils-api';

/**
 * @typedef {'mentions'|'commentLinks'|'wikilinks'|'templates'|'tags'} AutocompleteType
 */

/** @typedef {[string, string[], string[], string[]]} OpenSearchResults */

/**
 * @typedef {NonNullable<typeof Autocomplete.configs>} AutocompleteStaticConfig
 */

/**
 * @typedef {object} CommentLinksItem
 * @property {string} key
 * @property {string} [id]
 * @property {string} [authorName]
 * @property {string} [timestamp]
 * @property {string} [headline]
 */

/**
 * @typedef {string | string[] | CommentLinksItem} Item
 */

/**
 * @typedef {object} AutocompleteConfig
 * @property {StringArraysByKey} [cache] Results by query
 * @property {string[]} [lastResults] Results of last query
 * @property {string} [lastQuery] Last query
 * @property {Item[]} [default] Default set of items to search across (may be more narrow than the
 *   list of all potential values, as in the case of user names)
 * @property {(() => Item[])} [defaultLazy] Function for lazy loading of the defaults
 * @property {() => import('./tribute/Tribute').InsertData} [transform] Function that transforms
 *   the item into the data that is actually inserted
 * @property {AnyByKey} [data] Any additional data to be used by methods
 */

/**
 * @typedef {{ [key in AutocompleteType]: AutocompleteConfig }} AutocompleteConfigs
 */

/**
 * @typedef {(string | string[])[]} DefaultTags
 */

/**
 * Autocomplete dropdown class.
 */
class Autocomplete {
  /**
   * @type {AutocompleteConfig & AutocompleteStaticConfig['mentions']}
   */
  mentions;

  /**
   * @type {AutocompleteConfig & AutocompleteStaticConfig['commentLinks']}
   */
  commentLinks;

  /**
   * @type {AutocompleteConfig & AutocompleteStaticConfig['wikilinks']}
   */
  wikilinks;

  /**
   * @type {AutocompleteConfig & AutocompleteStaticConfig['templates']}
   */
  templates;

  /**
   * @type {AutocompleteConfig & AutocompleteStaticConfig['tags']}
   */
  tags;

  /**
   * Create an autocomplete instance. An instance is a set of settings and inputs to which these
   * settings apply.
   *
   * @param {object} options
   * @param {AutocompleteType[]} options.types Which values should be autocompleted.
   * @param {import('./TextInputWidget').default[]} options.inputs Inputs to attach the autocomplete
   *   to. Please note that these should be CD's {@link TextInputWidget}s, not
   *   {@link OO.ui.TextInputWidget OO.ui.TextInputWidget}s, since we use CD's method
   *   {@link TextInputWidget#cdInsertContent} on the inputs here. This is not essential, so if you
   *   borrow the source code, you can replace it with native
   *   {@link OO.ui.TextInputWidget#insertContent OO.ui.TextInputWidget#insertContent}.
   * @param {import('./Comment').default[]} [options.comments] List of comments in the section for
   *   the mentions and comment links autocomplete.
   * @param {string[]} [options.defaultUserNames] Default list of user names for the mentions
   *   autocomplete.
   */
  constructor({ types, inputs, comments, defaultUserNames }) {
    this.types = settings.get('autocompleteTypes');
    this.useTemplateData = settings.get('useTemplateData');

    // The `mentions` type is needed in any case as it can be triggered from the toolbar. When it is
    // not, we will suppress it specifically.
    types = types.filter((type) => this.types.includes(type) || type === 'mentions');

    /**
     * {@link https://github.com/zurb/tribute Tribute} object.
     *
     * @type {Tribute}
     */
    this.tribute = new Tribute({
      collection: this.getCollections(types, comments, defaultUserNames),
      allowSpaces: true,
      menuItemLimit: 10,
      noMatchTemplate: () => null,
      containerClass: 'tribute-container cd-autocompleteContainer',
      replaceTextSuffix: '',
      direction: cd.g.contentDirection,
    });

    /**
     * Inputs that have the autocomplete attached.
     *
     * @type {import('./TextInputWidget').default[]}
     * @private
     */
    this.inputs = inputs;
  }

  /**
   * Initialize autocomplete for the inputs.
   */
  init() {
    require('./tribute/tribute.less');

    this.inputs.forEach((input) => {
      const element = input.$input[0];
      this.tribute.attach(element);
      element.cdInput = input;
      element.addEventListener('tribute-active-true', () => {
        Autocomplete.activeMenu = this.tribute.menu;
      });
      element.addEventListener('tribute-active-false', () => {
        delete Autocomplete.activeMenu;
      });
      if (input instanceof OO.ui.MultilineTextInputWidget) {
        input.on('resize', () => {
          // @ts-expect-error: Ignore Tribute stuff
          this.tribute.menuEvents.windowResizeEvent?.();
        });
      }
    });
  }

  /**
   * Clean up event handlers.
   */
  cleanUp() {
    this.inputs.forEach((input) => {
      this.tribute.detach(input.$input[0]);
    });
  }

  /**
   * @typedef {{ [key in AutocompleteType]: import('./tribute/Tribute').TributeCollection }} CollectionsByType
   */

  /**
   * @template {any} [T=any]
   * @typedef {object} Value
   * @property {string} [key]
   * @property {T} item
   * @property {(() => import('./tribute/Tribute').InsertData) | undefined} [transform]
   */

  /**
   * Get the list of collections of specified types.
   *
   * @param {AutocompleteType[]} types
   * @param {import('./Comment').default[]} [comments=[]]
   * @param {string[]} [defaultUserNames=[]]
   * @returns {import('./tribute/Tribute').TributeCollection[]}
   * @private
   */
  getCollections(types, comments = [], defaultUserNames = []) {
    /** @type {import('./tribute/Tribute').TributeCollection['selectTemplate']} */
    const defaultSelectTemplate = (
      /** @type {import('./tribute/Tribute').TributeItem<Value> | undefined} */ item
    ) => (item && item.original.transform?.()) || '';
    /**
     * @template {Item} T
     * @param {T[]} arr
     * @param {AutocompleteConfig} config
     * @returns {Value<T>[]}
     */
    const getValuesForItems = (arr, config) =>
      arr
        .filter(defined)
        .filter(unique)
        .map((item) => {
          /** @type {string} */
          let key;
          if (Array.isArray(item)) {
            // Tags
            key = item[0];
          } else if (typeof item === 'object' && 'key' in item) {
            // Comment links
            key = item.key;
          } else {
            // The rest
            key = item;
          }

          /** @type {Value<T>} */
          const value = { key, item };
          value.transform = config.transform?.bind(value);

          return value;
        });

    const spacesRegexp = new RegExp(cd.mws('word-separator', { language: 'content' }), 'g');
    const allNssPattern = Object.keys(mw.config.get('wgNamespaceIds')).filter(Boolean).join('|');
    const allNamespacesRegexp = new RegExp(`^:?(?:${allNssPattern}):`, 'i');

    const collectionsByType = /** @satisfies {CollectionsByType} */ ({
      mentions: {
        label: cd.s('cf-autocomplete-mentions-label'),
        trigger: cd.config.mentionCharacter,
        searchOpts: { skip: true },
        requireLeadingSpace: cd.config.mentionRequiresLeadingSpace,
        selectTemplate: defaultSelectTemplate,
        values: async (text, callback) => {
          if (!this.types.includes('mentions') && !this.tribute.current.externalTrigger) return;

          text = removeDoubleSpaces(text);

          if (this.mentions.lastQuery && !text.startsWith(this.mentions.lastQuery)) {
            this.mentions.lastResults = [];
          }
          this.mentions.lastQuery = text;

          if (this.mentions.cache[text]) {
            callback(getValuesForItems(this.mentions.cache[text], this.mentions));
          } else {
            const matches = Autocomplete.search(text, this.mentions.default);
            let values = matches.slice();

            const makeRequest =
              text &&
              text.length <= 85 &&
              !/[#<>[\]|{}/@:]/.test(text) &&

              // 5 spaces in a user name seem too many. "Jack who built the house" has 4 :-)
              (text.match(spacesRegexp) || []).length <= 4;

            if (makeRequest) {
              // Logically, either `matched` or this.mentions.cache should have a zero length (a
              // request is made only if there are no matches in the section; if there are,
              // this.mentions.cache is an empty array).
              if (!matches.length) {
                values.push(...this.mentions.lastResults);
              }
              values = Autocomplete.search(text, values);

              // Make the user-typed text always appear last.
              values[values.length] = text.trim();
            }

            callback(getValuesForItems(values, this.mentions));

            if (makeRequest && !matches.length) {
              let vals;
              try {
                vals = await Autocomplete.getRelevantUserNames(text);
              } catch {
                return;
              }

              // To see the issue we're trying to prevent here, remove this line, type "[[Text",
              // then delete and type "<s" quickly.
              if (!this.tribute.current || this.tribute.current.trigger !== '@') return;

              this.mentions.lastResults = vals.slice();

              // Make the user-typed text always appear last.
              vals[vals.length] = text.trim();

              this.mentions.cache[text] = vals;

              // The text has been updated since the request was made.
              if (this.mentions.lastQuery !== text) return;

              callback(getValuesForItems(vals, this.mentions));
            }
          }
        },
      },

      commentLinks: {
        label: cd.s('cf-autocomplete-commentlinks-label'),
        trigger: '[[#',
        keepAsEnd: /^\]\]/,
        selectTemplate: defaultSelectTemplate,
        values: async (text, callback) => {
          this.commentLinks.default ||= /** @type {CommentLinksItem[]} */ (
            this.commentLinks.defaultLazy()
          );

          text = removeDoubleSpaces(text);
          if (/[#<>[\]|{}]/.test(text)) {
            callback([]);

            return;
          }

          callback(
            getValuesForItems(
              // Matches
              /** @type {import('./tribute/Tribute').TributeItem<CommentLinksItem>[]} */ (
                // @ts-expect-error: Ignore Tribute stuff
                this.tribute.search.filter(text, this.commentLinks.default, {
                  extract: (/** @type {CommentLinksItem} */ el) => el.key,
                })
              ).map((match) => match.original),

              this.commentLinks
            )
          );
        },
      },

      wikilinks: {
        label: cd.s('cf-autocomplete-wikilinks-label'),
        trigger: '[[',
        keepAsEnd: /^(?:\||\]\])/,
        searchOpts: { skip: true },
        selectTemplate: defaultSelectTemplate,
        values: async (text, callback) => {
          text = removeDoubleSpaces(text);

          if (this.wikilinks.lastQuery && !text.startsWith(this.wikilinks.lastQuery)) {
            this.wikilinks.lastResults = [];
          }
          this.wikilinks.lastQuery = text;

          if (this.wikilinks.cache[text]) {
            callback(getValuesForItems(this.wikilinks.cache[text], this.wikilinks));
          } else {
            /** @type {string[]} */
            let values = [];
            const valid =
              text &&
              text !== ':' &&
              text.length <= 255 &&

              // 10 spaces in a page name seems too many.
              (text.match(spacesRegexp) || []).length <= 9 &&

              // Forbidden characters
              !/[#<>[\]|{}]/.test(text) &&

              // Interwikis
              !(
                (text.startsWith(':') || /^[a-z-]\w*:/.test(text)) &&
                !allNamespacesRegexp.test(text)
              );
            if (valid) {
              values.push(...this.wikilinks.lastResults);
              values = Autocomplete.search(text, values);

              // Make the user-typed text always appear last.
              values[values.length] = text.trim();
            }

            callback(getValuesForItems(values, this.wikilinks));

            if (valid) {
              let vals;
              try {
                vals = await Autocomplete.getRelevantPageNames(text);
              } catch {
                return;
              }

              // Type "[[Text", then delete and type "<s" quickly.
              if (!this.tribute.current || this.tribute.current.trigger !== '[[') return;

              this.wikilinks.lastResults = vals.slice();

              // Make the user-typed text always appear last.
              vals[vals.length] = text.trim();

              this.wikilinks.cache[text] = vals;

              // The text has been updated since the request was made.
              if (this.wikilinks.lastQuery !== text) return;

              callback(getValuesForItems(vals, this.wikilinks));
            }
          }
        },
      },

      templates: {
        label: cd.s('cf-autocomplete-templates-label'),
        trigger: '{{',
        keepAsEnd: /^(?:\||\}\})/,
        searchOpts: { skip: true },
        selectTemplate: (item, event) => {
          if (item) {
            if (this.useTemplateData && event.shiftKey && !event.altKey) {
              const input = /** @type {import('./TextInputWidget').default} */ (
                /** @type {HTMLElement} */ (this.tribute.current.element).cdInput
              );
              setTimeout(() => this.autocompleteTemplateData(item, input));
            }

            return item.original.transform();
          }

          return '';
        },
        values: async (text, callback) => {
          text = removeDoubleSpaces(text);

          if (this.templates.lastQuery && !text.startsWith(this.templates.lastQuery)) {
            this.templates.lastResults = [];
          }
          this.templates.lastQuery = text;

          if (text.includes('{{')) {
            callback([]);
            return;
          }

          if (this.templates.cache[text]) {
            callback(getValuesForItems(this.templates.cache[text], this.templates));
          } else {
            /** @type {string[]} */
            let values = [];
            const makeRequest =
              text &&
              text.length <= 255 &&
              !/[#<>[\]|{}]/.test(text) &&

              // 10 spaces in a page name seems too many.
              (text.match(spacesRegexp) || []).length <= 9;
            if (makeRequest) {
              values.push(...this.templates.lastResults);
              values = Autocomplete.search(text, values);

              // Make the user-typed text always appear last.
              values[values.length] = text.trim();
            }

            callback(getValuesForItems(values, this.templates));

            if (makeRequest) {
              let vals;
              try {
                vals = await Autocomplete.getRelevantTemplateNames(text);
              } catch {
                return;
              }

              // Type "{{Text", then delete and type "<s" quickly.
              if (!this.tribute.current || this.tribute.current.trigger !== '{{') return;

              this.templates.lastResults = vals.slice();

              // Make the user-typed text always appear last.
              vals[vals.length] = text.trim();

              this.templates.cache[text] = vals;

              // The text has been updated since the request was made.
              if (this.templates.lastQuery !== text) return;

              callback(getValuesForItems(vals, this.templates));
            }
          }
        },
      },

      tags: {
        label: cd.s('cf-autocomplete-tags-label'),
        trigger: '<',
        keepAsEnd: /^>/,
        replaceEnd: false,
        searchOpts: { skip: true },
        selectTemplate: defaultSelectTemplate,
        values: (text, callback) => {
          this.tags.default ||= /** @type {DefaultTags} */ (this.tags.defaultLazy());

          const regexp = new RegExp('^' + mw.util.escapeRegExp(text), 'i');
          if (!text || !/^[a-z]+$/i.test(text)) {
            callback([]);

            return;
          }

          callback(
            getValuesForItems(
              // Matches
              /** @type {DefaultTags} */ (this.tags.default).filter((tag) =>
                regexp.test(Array.isArray(tag) ? tag[0] : tag)
              ),

              this.tags
            )
          );
        },
      },
    });

    /** @type {Partial<AutocompleteConfigs>} */
    const params = {
      mentions: { default: defaultUserNames || [] },
      commentLinks: { data: { comments } },
    };

    types.forEach((type) => {
      /** @type {AutocompleteStaticConfig[type]} */ (this[type]) = OO.copy(
        /** @type {AutocompleteStaticConfig} */ (Autocomplete.configs)[type]
      );

      if (type in params) {
        Object.assign(this[type], params[/** @type {keyof typeof params} */ (type)]);
      }
    });

    return types.map((type) => collectionsByType[type]);
  }

  static delay = 100;

  /** @type {HTMLElement|undefined} */
  static activeMenu;

  static {
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
        '<syntaxhighlight inline lang="', '"></syntaxhighlight>',
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
         * @this {Value<string>}
         * @returns {import('./tribute/Tribute').InsertData}
         */
        transform() {
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
        defaultLazy: function () {
          return /** @type {{ comments: import('./Comment').default[] }} */ (this.data).comments
            .reduce((acc, comment) => {
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
                id: comment.getUrlFragment(),
                authorName,
                timestamp,
              });

              return acc;
            }, /** @type {CommentLinksItem[]} */([]))
            .concat(
              sectionRegistry.getAll().reduce((acc, section) => {
                acc.push({
                  key: underlinesToSpaces(section.id),
                  id: underlinesToSpaces(section.id),
                  headline: section.headline,
                });

                return acc;
              }, /** @type {CommentLinksItem[]} */([]))
            );
          },

        /**
         * @this {Value<CommentLinksItem>}
         * @returns {import('./tribute/Tribute').InsertData}
         */
        transform() {
          const object = this.item;

          return {
            start: `[[#${object.id}|`,
            end: ']]',
            content:
              'timestamp' in object
                ? cd.s('cf-autocomplete-commentlinks-text', object.authorName, object.timestamp)
                : object.headline,
          };
        },
      },

      wikilinks: {
        cache: {},
        /** @type {string[]} */
        lastResults: [],

        /**
         * @this {Value<string>}
         * @returns {import('./tribute/Tribute').InsertData}
         */
        transform() {
          return {
            start: '[[' + this.item.trim(),
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
         * @this {Value<string>}
         * @returns {import('./tribute/Tribute').InsertData}
         */
        transform() {
          return {
            start: '{{' + this.item.trim(),
            end: '}}',
            shiftModify() {
              this.start += '|';
            },
          };
        },
      },

      tags: {
        defaultLazy: () =>
          /** @type {Array<string|string[]>} */(cd.g.allowedTags)
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

        /** @type {DefaultTags | undefined} */
        default: undefined,

        /**
         * @this {Value<string | [string, string, string?]>}
         * @returns {import('./tribute/Tribute').InsertData}
         */
        transform() {
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

  /**
   * Get autocomplete data for a template.
   *
   * @param {import('./tribute/Tribute').TributeItem<Value<string>>} item
   * @param {import('./TextInputWidget').default} input
   * @returns {Promise<void>}
   */
  async autocompleteTemplateData(item, input) {
    input
      .setDisabled(true)
      .pushPending();

    /** @type {APIResponseTemplateData} */
    let response;
    try {
      response = await cd.getApi().get({
        action: 'templatedata',
        titles: `Template:${item.original.key}`,
        redirects: true,
      }).catch(handleApiReject);
      if (!response.pages) {
        throw 'No data.';
      } else if (!Object.keys(response.pages).length) {
        throw 'Template missing.';
      }
    } catch {
      input
        .setDisabled(false)
        .focus();
      input.popPending();
      // throw new CdError({
      //   type: 'response',
      //   message: cd.s('cf-autocomplete-templates-error', item.original.key),
      // });

      return;
    }

    const pages = response.pages;
    let paramsString = '';
    let firstValueIndex = 0;
    Object.keys(pages).forEach((key) => {
      const template = pages[key];
      const params = template.params || [];

      // Parameter names
      (template.paramOrder || Object.keys(params))

        .filter((param) => params[param].required || params[param].suggested)
        .forEach((param) => {
          if (template.format === 'block') {
            paramsString += `\n| ${param} = `;
          } else {
            paramsString += Number.isNaN(Number(param)) ? `|${param}=` : `|`;
          }
          firstValueIndex ||= paramsString.length;
        });
      if (template.format === 'block' && paramsString) {
        paramsString += '\n';
      }
    });

    // Remove leading "|".
    paramsString = paramsString.slice(1);

    input
      .setDisabled(false)
      .insertContent(paramsString)

      // `input.getRange().to` is the current caret index
      .selectRange(/** @type {number} */ (input.getRange().to) + firstValueIndex - 1)

      .popPending();
  }

  /**
   * Get the active autocomplete menu element.
   *
   * @returns {Element|undefined}
   */
  static getActiveMenu() {
    return this.activeMenu;
  }

  /**
   * Get a list of 10 user names matching the specified search text. User names are sorted as
   * {@link https://www.mediawiki.org/wiki/API:Opensearch OpenSearch} sorts them. Only users with a
   * talk page existent are included. Redirects are resolved.
   *
   * Reuses the existing request if available.
   *
   * @param {string} text
   * @returns {Promise.<string[]>}
   * @throws {CdError}
   */
  static getRelevantUserNames(text) {
    text = ucFirst(text);
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve, reject) => {
      await sleep(this.delay);

      try {
        if (promise !== this.currentPromise) {
          throw new CdError();
        }

        /**
         * @typedef {[string, string[], string[], string[]]} OpenSearchResults
         */

        // First, try to use the search to get only users that have talk pages. Most legitimate
        // users do, while spammers don't.
        const response = /** @type {OpenSearchResults} */ (
          await cd
            .getApi()
            .get({
              action: 'opensearch',
              search: text,
              namespace: 3,
              redirects: 'resolve',
              limit: 10,
            })
            .catch(handleApiReject)
        );

        const users = response[1]
          ?.map((name) => (name.match(cd.g.userNamespacesRegexp) || [])[1])
          .filter(defined)
          .filter((name) => !name.includes('/'));

        if (users.length) {
          resolve(users);
        } else {
          // If we didn't succeed with search, try the entire users database.
          const allUsersResponse =
            /** @type {ApiResponseQuery<ApiResponseQueryContentAllUsers>} */ (
              await cd
                .getApi()
                .get({
                  action: 'query',
                  list: 'allusers',
                  auprefix: text,
                })
                .catch(handleApiReject)
            );
          if (!allUsersResponse.query) return;

          resolve(allUsersResponse.query.allusers.map((user) => user.name));
        }
      } catch (error) {
        reject(error);
      }
    });
    this.currentPromise = promise;

    return promise;
  }

  /**
   * Given a query and a case-insensitively matching result, replace the first character of the
   * result with the first character of in the query. E.g., the query "huma" finds the article
   * "Human", but we restore the first "h".
   *
   * @param {string} result
   * @param {string} query
   * @returns {string}
   */
  static useOriginalFirstCharCase(result, query) {
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
        '^' + firstCharUpperCase === firstChar
          ? mw.util.escapeRegExp(firstChar)
          : '[' + firstCharUpperCase + firstChar + ']'
      ),
      firstChar
    );
  }

  /**
   * Get a list of 10 page names matching the specified search text. Page names are sorted as
   * {@link https://www.mediawiki.org/wiki/API:Opensearch OpenSearch} sorts them. Redirects are not
   * resolved.
   *
   * Reuses the existing request if available.
   *
   * @param {string} text
   * @returns {Promise.<string[]>}
   * @throws {CdError}
   */
  static getRelevantPageNames(text) {
    let colonPrefix = false;
    if (cd.g.colonNamespacesPrefixRegexp.test(text)) {
      text = text.slice(1);
      colonPrefix = true;
    }

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve, reject) => {
      await sleep(this.delay);

      try {
        if (promise !== this.currentPromise) {
          throw new CdError();
        }

        const response = /** @type {OpenSearchResults} */ (await cd.getApi().get({
          action: 'opensearch',
          search: text,
          redirects: 'return',
          limit: 10,
        }).catch(handleApiReject));

        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const results = response[1]?.map((/** @type {string} */ name) => {
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
        });

        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
    this.currentPromise = promise;

    return promise;
  }

  /**
   * Get a list of 10 template names matching the specified search text. Template names are sorted as
   * {@link https://www.mediawiki.org/wiki/API:Opensearch OpenSearch} sorts them. Redirects are not
   * resolved.
   *
   * Reuses the existing request if available.
   *
   * @param {string} text
   * @returns {Promise.<string[]>}
   * @throws {CdError}
   */
  static getRelevantTemplateNames(text) {
    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve, reject) => {
      await sleep(this.delay);

      try {
        if (promise !== this.currentPromise) {
          throw new CdError();
        }

        const response = /** @type {OpenSearchResults} */ (await cd.getApi().get({
          action: 'opensearch',
          search: text.startsWith(':') ? text.slice(1) : 'Template:' + text,
          redirects: 'return',
          limit: 10,
        }).catch(handleApiReject));

        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const results = response[1]
          ?.filter((name) => !/(\/doc(?:umentation)?|\.css)$/.test(name))
          .map((name) => text.startsWith(':') ? name : name.slice(name.indexOf(':') + 1))
          .map((name) => (
            mw.config.get('wgCaseSensitiveNamespaces').includes(10) ?
              name :
              this.useOriginalFirstCharCase(name, text)
          ));

        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
    this.currentPromise = promise;

    return promise;
  }

  /**
   * Search for a string in a list of values.
   *
   * @param {string} string
   * @param {string[]} list
   * @returns {string[]} Matched results.
   * @private
   */
  static search(string, list) {
    const containsRegexp = new RegExp(mw.util.escapeRegExp(string), 'i');
    const startsWithRegexp = new RegExp('^' + mw.util.escapeRegExp(string), 'i');
    return list
      .filter((item) => containsRegexp.test(item))
      .sort(
        (item1, item2) =>
          Number(startsWithRegexp.test(item2)) - Number(startsWithRegexp.test(item1))
      );
  }
}

export default Autocomplete;
