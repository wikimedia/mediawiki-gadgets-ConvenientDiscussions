import AutocompleteFactory from './AutocompleteFactory';
import AutocompletePerformanceMonitor from './AutocompletePerformanceMonitor';
import cd from './cd';
import settings from './settings';
import CdError from './shared/CdError';
import { defined, sleep, ucFirst } from './shared/utils-general';
import Tribute from './tribute/Tribute';
import { handleApiReject } from './utils-api';

/**
 * @typedef {'mentions' | 'commentLinks' | 'wikilinks' | 'templates' | 'tags'} AutocompleteType
 */

/** @typedef {[string, string[], string[], string[]]} OpenSearchResults */

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
 * @property {string} [snippet]
 * @property {string} [headline]
 */

/**
 * @typedef {object} TagsItem
 * @property {string} name
 * @property {string} [attributes]
 */

/**
 * @typedef {(results: import('./BaseAutocomplete').Result[]) => void} ProcessValues
 */

/**
 * @typedef {object} AutocompleteConfigShared
 * @property {import('./AutocompleteTypes').Item[]} [default] Default set of items to search across
 *   (may be more narrow than the list of all potential values, as in the case of user names)
 * @property {(() => import('./AutocompleteTypes').Item[])} [defaultLazy] Function for lazy loading
 *   of the defaults
 * @property {() => import('./tribute/Tribute').InsertData} [transformItemToInsertData] Function
 *   that transforms the item into the data that is actually inserted
 * @property {AnyByKey} [data] Any additional data to be used by methods
 * @property {number} [cacheMaxSize]
 * @property {number} [cacheTtl]
 * @property {number} [cacheMaxMemory]
 */

/**
 * Autocomplete manager class that coordinates type-specific autocomplete instances.
 * This class replaces the monolithic Autocomplete class with a cleaner architecture
 * that delegates to specialized autocomplete classes for each type.
 */
class AutocompleteManager {
  /**
   * Create an autocomplete manager instance. An instance is a set of settings and inputs to which
   * these settings apply.
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
   * @param {boolean} [options.enablePerformanceMonitoring] Whether to enable performance monitoring
   */
  constructor({ types, inputs, comments, defaultUserNames, enablePerformanceMonitoring = false }) {
    this.types = settings.get('autocompleteTypes');
    this.useTemplateData = settings.get('useTemplateData');

    types = types.filter((type) => this.types.includes(type));

    /**
     * Performance monitor for tracking autocomplete performance.
     *
     * @type {AutocompletePerformanceMonitor | undefined}
     * @private
     */
    this.performanceMonitor = enablePerformanceMonitoring
      ? new AutocompletePerformanceMonitor({
        enabled: true,
        maxMetrics: 500,
        reportInterval: 0, // Disable automatic reporting
      })
      : undefined;

    /**
     * Map of autocomplete type to autocomplete instance.
     *
     * @type {Map<AutocompleteType, import('./BaseAutocomplete').default>}
     * @private
     */
    this.autocompleteInstances = new Map();

    // Create type-specific autocomplete instances
    this.createAutocompleteInstances(types, comments, defaultUserNames);

    /**
     * {@link https://github.com/zurb/tribute Tribute} object.
     *
     * @type {Tribute}
     */
    this.tribute = new Tribute({
      collection: this.getCollections(),
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
   * Create autocomplete instances for the specified types.
   *
   * @param {AutocompleteType[]} types Types to create instances for
   * @param {import('./Comment').default[]} [comments] Comments for comment links autocomplete
   * @param {string[]} [defaultUserNames] Default user names for mentions autocomplete
   * @private
   */
  createAutocompleteInstances(types, comments = [], defaultUserNames = []) {
    types.forEach((type) => {
      const config = {};

      // Set type-specific configuration
      if (type === 'mentions') {
        config.default = defaultUserNames;
      } else if (type === 'commentLinks') {
        config.data = { comments };
      }

      this.autocompleteInstances.set(type, AutocompleteFactory.create(type, config));
    });
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
        AutocompleteManager.activeMenu = this.tribute.menu;
      });
      element.addEventListener('tribute-active-false', () => {
        delete AutocompleteManager.activeMenu;
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
   * Remove event handlers.
   */
  terminate() {
    this.inputs.forEach((input) => {
      this.tribute.detach(input.$input[0]);
    });

    // Clean up autocomplete instances
    for (const instance of this.autocompleteInstances.values()) {
      if (typeof instance.destroy === 'function') {
        instance.destroy();
      }
    }

    // Clean up performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.destroy();
      this.performanceMonitor = undefined;
    }
  }

  /**
   * Get the list of collections for all configured autocomplete types.
   *
   * @returns {import('./tribute/Tribute').TributeCollection[]}
   * @private
   */
  getCollections() {
    const collections = [];

    for (const [type, instance] of this.autocompleteInstances) {
      collections.push(
        /** @type {import('./tribute/Tribute').TributeCollection} */ ({
          lookup: 'label',
          label: instance.getLabel(),
          trigger: instance.getTrigger(),
          searchOpts: { skip: true },
          selectTemplate: (/** @type {any} */ item, /** @type {any} */ event) => {
            if (item) {
              // Handle special template data insertion for templates
              if (
                type === 'templates' &&
                this.useTemplateData &&
                event?.shiftKey &&
                !event?.altKey
              ) {
                const input = /** @type {import('./TextInputWidget').default} */ (
                  /** @type {HTMLElement} */ (this.tribute.current.element).cdInput
                );
                setTimeout(() => this.insertTemplateData(item, input));
              }

              return item.original.transform?.() || '';
            }

            return '';
          },
          values: async (/** @type {string} */ text, /** @type {ProcessValues} */ callback) => {
            // Start performance monitoring if enabled
            const perfContext = this.performanceMonitor?.startOperation('getValues', type, text);

            try {
              // Check if result will come from cache
              const cacheHit = instance.handleCache(text) !== null;

              await instance.getValues(text, (/** @type {any[]} */ results) => {
                // End performance monitoring
                if (perfContext) {
                  perfContext.end(results.length, cacheHit);
                }
                callback(results);
              });
            } catch (error) {
              // End performance monitoring on error
              if (perfContext) {
                perfContext.end(0, false);
              }
              throw error;
            }
          },

          // Add type-specific properties from the instance
          ...instance.getCollectionProperties(),
        })
      );
    }

    return collections;
  }

  /**
   * Get autocomplete data for a template.
   *
   * @param {import('./tribute/Tribute').TributeSearchResults<import('./BaseAutocomplete').Result<string>>} item
   * @param {import('./TextInputWidget').default} input
   * @returns {Promise<void>}
   */
  async insertTemplateData(item, input) {
    input
      .setDisabled(true)
      .pushPending();

    /** @type {APIResponseTemplateData} */
    let response;
    try {
      response = await cd.getApi(AutocompleteManager.apiConfig).get({
        action: 'templatedata',
        titles: `Template:${item.original.label}`,
        redirects: true,
      }).catch(handleApiReject);
      if (!Object.keys(response.pages).length) {
        throw new CdError('Template missing.');
      }
    } catch {
      input
        .setDisabled(false)
        .focus()
        .popPending();

      return;
    }

    const pages = response.pages;
    let paramsString = '';
    let firstValueIndex = 0;
    Object.keys(pages).forEach((key) => {
      const template = pages[key];
      const params = template.params || {};

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
      .selectRange(/** @type {number} */ (input.getRange().to || 0) + firstValueIndex - 1)

      .popPending();
  }

  // Static properties and methods for backward compatibility

  static delay = 100;

  static apiConfig = { ajax: { timeout: 1000 * 5 } };

  /** @type {HTMLElement|undefined} */
  static activeMenu;

  /** @type {Promise<any> | undefined} */
  static currentPromise;

  /**
   * Get the active autocomplete menu element.
   *
   * @returns {Element|undefined}
   */
  static getActiveMenu() {
    return this.activeMenu;
  }

  /**
   * Check if the specified promise is not the current promise in order to detect (pretty frequent)
   * occasions when a new request was already made and we should abort this one.
   *
   * @param {Promise<any>} promise
   * @throws {CdError}
   */
  static promiseIsNotSuperseded(promise) {
    if (promise !== this.currentPromise) {
      throw new CdError();
    }
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
      try {
        await sleep(this.delay);
        AutocompleteManager.promiseIsNotSuperseded(promise);

        // First, try to use the search to get only users that have talk pages. Most legitimate
        // users do, while spammers don't.
        const response = /** @type {OpenSearchResults} */ (
          await cd
            .getApi(AutocompleteManager.apiConfig)
            .get({
              action: 'opensearch',
              search: text,
              namespace: 3,
              redirects: 'resolve',
              limit: 10,
            })
            .catch(handleApiReject)
        );
        AutocompleteManager.promiseIsNotSuperseded(promise);

        const users = response[1]
          .map((name) => (name.match(cd.g.userNamespacesRegexp) || [])[1])
          .filter(defined)
          .filter((name) => !name.includes('/'));

        if (users.length) {
          resolve(users);

          return;
        }

        // If we didn't succeed with search, try the entire users database.
        const allUsersResponse =
          /** @type {ApiResponseQuery<ApiResponseQueryContentAllUsers>} */ (
            await cd
              .getApi(AutocompleteManager.apiConfig)
              .get({
                action: 'query',
                list: 'allusers',
                auprefix: text,
              })
              .catch(handleApiReject)
          );
        AutocompleteManager.promiseIsNotSuperseded(promise);

        if (!allUsersResponse.query) {
          throw new CdError();
        }

        resolve(allUsersResponse.query.allusers.map((user) => user.name));
      } catch (e) {
        reject(e);
      }
    });

    this.currentPromise = promise;

    return promise;
  }

  /**
   * Use the original first character case if the result is not a redirect.
   *
   * @param {string} result
   * @param {string} query
   * @returns {string}
   */
  static useOriginalFirstCharCase(result, query) {
    // But ignore cases with all caps in the first word like ABBA
    const firstWord = result.split(' ')[0];
    if (
      firstWord.toUpperCase() !== firstWord &&
      result.charAt(0).toLowerCase() === query.charAt(0).toLowerCase()
    ) {
      result = query.charAt(0) + result.slice(1);
    }

    return result;
  }

  /**
   * Get a list of 10 page names matching the specified search text. Page names are sorted as
   * {@link https://www.mediawiki.org/wiki/API:Opensearch OpenSearch} sorts them. Redirects are
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
      colonPrefix = true;
      text = text.slice(1);
    }

    // eslint-disable-next-line no-async-promise-executor
    const promise = new Promise(async (resolve, reject) => {
      try {
        await sleep(this.delay);
        AutocompleteManager.promiseIsNotSuperseded(promise);

        const response = /** @type {OpenSearchResults} */ (
          await cd
            .getApi(AutocompleteManager.apiConfig)
            .get({
              action: 'opensearch',
              search: text,
              redirects: 'resolve',
              limit: 10,
            })
            .catch(handleApiReject)
        );
        AutocompleteManager.promiseIsNotSuperseded(promise);

        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const results = response[1]
          .map((result) => AutocompleteManager.useOriginalFirstCharCase(result, text))
          .map((result) => (colonPrefix ? ':' + result : result));

        resolve(results);
      } catch (e) {
        reject(e);
      }
    });

    this.currentPromise = promise;

    return promise;
  }

  /**
   * Get a list of 10 template names matching the specified search text. Template names are sorted
   * as {@link https://www.mediawiki.org/wiki/API:Opensearch OpenSearch} sorts them. Redirects are
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
      try {
        await sleep(this.delay);
        AutocompleteManager.promiseIsNotSuperseded(promise);

        const response = /** @type {OpenSearchResults} */ (
          await cd
            .getApi(AutocompleteManager.apiConfig)
            .get({
              action: 'opensearch',
              search: text,
              namespace: 10,
              redirects: 'resolve',
              limit: 10,
            })
            .catch(handleApiReject)
        );
        AutocompleteManager.promiseIsNotSuperseded(promise);

        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const results = response[1]
          .map((result) => result.replace(/^Template:/, ''))
          .map((result) => AutocompleteManager.useOriginalFirstCharCase(result, text));

        resolve(results);
      } catch (e) {
        reject(e);
      }
    });

    this.currentPromise = promise;

    return promise;
  }

  /**
   * @typedef {object} CombinedPerformanceMetrics
   * @property {object} manager
   * @property {number} manager.instanceCount
   * @property {AutocompleteType[]} manager.types
   * @property {boolean} manager.monitoringEnabled
   * @property {TypeByKey<import('./BaseAutocomplete').PerformanceMetrics>} instances
   * @property {undefined} monitor
   */

  /**
   * Get performance metrics for all autocomplete instances.
   *
   * @returns {CombinedPerformanceMetrics} Combined performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {
      manager: {
        instanceCount: this.autocompleteInstances.size,
        types: Array.from(this.autocompleteInstances.keys()),
        monitoringEnabled: this.performanceMonitor !== undefined,
      },
      instances: (/** @type {TypeByKey<import('./BaseAutocomplete').PerformanceMetrics>} */ ({})),
      monitor: undefined,
    };

    // Get metrics from each instance
    for (const [type, instance] of this.autocompleteInstances) {
      if (typeof instance.getPerformanceMetrics === 'function') {
        metrics.instances[type] = instance.getPerformanceMetrics();
      }
    }

    // Get monitor metrics if available
    if (this.performanceMonitor) {
      metrics.monitor = this.performanceMonitor.generateSummary();
    }

    return metrics;
  }

  /**
   * Generate a performance report.
   *
   * @returns {string} Formatted performance report
   */
  generatePerformanceReport() {
    if (!this.performanceMonitor) {
      return 'Performance monitoring is not enabled.';
    }

    return this.performanceMonitor.generateReport();
  }

  /**
   * Optimize all autocomplete instances.
   */
  optimizePerformance() {
    for (const instance of this.autocompleteInstances.values()) {
      if (typeof instance.optimizeCache === 'function') {
        instance.optimizeCache();
      }
    }
  }

  /**
   * Prefetch common queries for all instances.
   *
   * @param {object} commonQueriesByType Object mapping type to array of common queries
   * @returns {Promise<void>}
   */
  async prefetchCommonQueries(commonQueriesByType) {
    const promises = [];

    for (const [type, queries] of Object.entries(commonQueriesByType)) {
      const instance = this.autocompleteInstances.get(type);
      if (instance && typeof instance.prefetchCommonQueries === 'function') {
        promises.push(instance.prefetchCommonQueries(queries));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Enable performance monitoring.
   */
  enablePerformanceMonitoring() {
    if (this.performanceMonitor) {
      this.performanceMonitor.enable();
    } else {
      this.performanceMonitor = new AutocompletePerformanceMonitor({
        enabled: true,
        maxMetrics: 500,
        reportInterval: 0,
      });
    }
  }

  /**
   * Disable performance monitoring.
   */
  disablePerformanceMonitoring() {
    if (this.performanceMonitor) {
      this.performanceMonitor.disable();
    }
  }

  /**
   * Search for a string in a list of strings. Return the matching strings.
   *
   * @param {string} string
   * @param {string[]} list
   * @returns {string[]}
   */
  static search(string, list) {
    const containsRegexp = new RegExp(mw.util.escapeRegExp(string), 'i');
    const startsWithRegexp = new RegExp('^' + mw.util.escapeRegExp(string), 'i');

    return list
      .filter((item) => containsRegexp.test(item))
      .sort((item1, item2) => {
        const item1StartsWith = startsWithRegexp.test(item1);
        const item2StartsWith = startsWithRegexp.test(item2);
        if (item1StartsWith && !item2StartsWith) {
          return -1;
        } else if (!item1StartsWith && item2StartsWith) {
          return 1;
        }

        return 0;
      });
  }
}

export default AutocompleteManager;
