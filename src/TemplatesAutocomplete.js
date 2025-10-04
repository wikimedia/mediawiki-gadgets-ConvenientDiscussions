import BaseAutocomplete from './BaseAutocomplete';
import cd from './cd';
import CdError from './shared/CdError';
import { charAt, phpCharToUpper } from './shared/utils-general';
import { handleApiReject } from './utils-api';

/**
 * @typedef {string} TemplateItem
 */

/**
 * Autocomplete class for templates. Handles template name validation, TemplateData API integration,
 * and template parameter insertion with Shift+Enter functionality.
 *
 * @extends BaseAutocomplete
 */
class TemplatesAutocomplete extends BaseAutocomplete {
  /**
   * Create a TemplatesAutocomplete instance.
   *
   * @param {import('./AutocompleteManager').AutocompleteConfigShared} [config] Configuration options
   */
  constructor(config = {}) {
    super(config);
  }

  /**
   * @override
   * @returns {string}
   */
  getLabel() {
    return cd.s('cf-autocomplete-templates-label');
  }

  /**
   * @override
   * @returns {string}
   */
  getTrigger() {
    return '{{';
  }

  /**
   * @override
   * @param {string} text The input text to validate
   * @returns {boolean} Whether the input is valid for templates
   */
  validateInput(text) {
    return !!(
      text &&
      text.length <= 255 &&
      !/[#<>[\]|{}]/.test(text) &&

      // 10 spaces in a page name seems too many.
      (text.match(new RegExp(cd.mws('word-separator', { language: 'content' }), 'g')) || []).length <= 9 &&

      // Don't allow nested templates
      !text.includes('{{')
    );
  }

  /**
   * @override
   * @param {string} text The search text
   * @returns {Promise<string[]>} Promise resolving to array of template suggestions
   */
  async makeApiRequest(text) {
    return BaseAutocomplete.createDelayedPromise(async (resolve) => {
      const response = await cd
        .getApi(BaseAutocomplete.apiConfig)
        .get({
          action: 'opensearch',
          search: text.startsWith(':') ? text.slice(1) : 'Template:' + text,
          redirects: 'return',
          limit: 10,
        })
        .catch(handleApiReject);

      BaseAutocomplete.promiseIsNotSuperseded(BaseAutocomplete.currentPromise);

      resolve(response[1]
        .filter((name) => !/(\/doc(?:umentation)?|\.css)$/.test(name))
        .map((name) => text.startsWith(':') ? name : name.slice(name.indexOf(':') + 1))
        .map((name) => (
          mw.config.get('wgCaseSensitiveNamespaces').includes(10)
            ? name
            : this.useOriginalFirstCharCase(name, text)
        )));
    });
  }

  /**
   * Transform a template name item into insert data for the Tribute library.
   *
   * @override
   * @param {string} item The template name to transform
   * @returns {import('./tribute/Tribute').InsertData & { end: string }}
   */
  getInsertDataFromItem(item) {
    return {
      start: '{{' + item.trim(),
      end: '}}',
      shiftModify() {
        this.start += '|';
      },
    };
  }

  /**
   * Get collection-specific properties for Tribute configuration.
   *
   * @override
   * @returns {Partial<import('./tribute/Tribute').TributeCollection>} Collection properties
   */
  getCollectionProperties() {
    return {
      keepAsEnd: /^(?:\||\}\})/,
    };
  }

  /**
   * Use the original first character case from the query in the result.
   * This preserves user's intended capitalization for template names.
   *
   * @param {string} result The result string
   * @param {string} query The original query
   * @returns {string} Result with corrected first character case
   */
  useOriginalFirstCharCase(result, query) {
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
   * Get autocomplete data for a template and insert template parameters.
   * This method handles the Shift+Enter functionality for template parameter insertion.
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
      response = await cd.getApi(BaseAutocomplete.apiConfig).get({
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
          if (!firstValueIndex) {
            firstValueIndex = paramsString.length;
          }
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
}

export default TemplatesAutocomplete;
