/**
 * Error type:
 * - `'internal'` for errors defined in the script related to the script's internal logic
 * - `'network'` for network errors defined in the script, whether on the client or server
 * - `'api'` for MediaWiki API errors defined on the server
 * - `'response'` for errors defined in the script when there is something wrong with the MediaWiki
 *   API response, excluding MediaWiki API errors defined on the server
 * - `'parse'` for parse errors defined in the script
 * - `'ui'` for UI errors (e.g. when the user does something wrong and we can't handle it silently)
 * - `'javascript'` for JavaScript errors
 *
 * @typedef {'internal' | 'network' | 'api' | 'response' | 'parse' | 'ui' | 'javascript'} ErrorType
 */

/**
 * @typedef {object} ErrorDataServerDefinedApiError
 * @property {'api'} type
 * @property {string} code
 * @property {import('types-mediawiki/mw/Api').ApiResponse} apiResponse
 * @property {string} html
 */

/**
 * @typedef {object} ErrorDataResponseError
 * @property {'response'} type
 * @property {string} code
 * @property {import('types-mediawiki/mw/Api').ApiResponse} [apiResponse]
 */

/**
 * @template {ErrorType} [T=ErrorType]
 * @typedef {object} ErrorDataBase
 * @property {ErrorType} [type='internal']
 * @property {string} [code]
 * @property {AnyByKey} [details={}]
 * @property {string} [message]
 * @property {JQuery} [$interactiveMessage]
 * @property {import('types-mediawiki/mw/Api').ApiResponse} [apiResponse]
 * @property {string} [html]
 */

/**
 * @template {ErrorType} T
 * @typedef {Expand<
 *     ErrorDataBase<T>
 *   & (ErrorDataServerDefinedApiError | ErrorDataResponseError | {})
 * >} ErrorDataParameter
 */

/**
 * @template {ErrorType} T
 * @typedef {MakeRequired<ErrorDataParameter<T>, 'type' | 'details'>} ErrorData
 */

/**
 * Script's custom error class.
 *
 * @template {ErrorType} [T=ErrorType]
 * @augments Error
 */
class CdError extends Error {
  /**
   * @type {ErrorData<ErrorType>}
   * @private
   */
  data;

  /**
   * Create a custom error.
   *
   * @param {ErrorDataParameter<T> | string} [data]
   */
  constructor(data = {}) {
    if (typeof data === 'string') {
      data = { message: data };
    }

    data.type ??= 'internal';
    data.details ??= {};
    super(
      data.type +
      (data.code ? '/' + data.code : '') +
      (typeof data.message === 'string' ? ': ' + data.message : '')
    );

    this.name = 'CdError';
    this.data = /** @type {ErrorData<ErrorType>} */ (data);
  }

  /**
   * @returns {this is CdError<'api'>}
   */
  isServerDefinedApiError() {
    return this.data.type === 'api';
  }

  /**
   * Get the error type.
   *
   * @returns {T}
   */
  getType() {
    return /** @type {T} */ (this.data.type);
  }

  /**
   * Get the error message (simple string or HTML, depending on where it is supposed to go).
   *
   * @returns {string | undefined}
   */
  getMessage() {
    return this.data.message;
  }

  /**
   * Get an interactive (with events) error message to show in the UI.
   *
   * @returns {JQuery | undefined}
   */
  getInteractiveMessage() {
    return this.data.$interactiveMessage;
  }

  /**
   * Set the error message.
   *
   * @param {string} message
   */
  setMessage(message) {
    this.data.message = message;
  }

  /**
   * Get the error code.
   *
   * @returns {string | undefined}
   */
  getCode() {
    return this.data.code;
  }

  /**
   * Get the HTML code sent by the server.
   *
   * @returns {T extends 'api' ? string : undefined}
   */
  getHtml() {
    return /** @type {T extends 'api' ? string : undefined} */ (
      this.isServerDefinedApiError() ? this.data.html : undefined
    );
  }

  /**
   * @typedef {( T extends 'api'
   *     ? import('types-mediawiki/mw/Api').ApiResponse
   *     : T extends 'response'
   *       ? (import('types-mediawiki/mw/Api').ApiResponse | undefined)
   *       : undefined
   * )} ApiResponseType
   */

  /**
   * Get the whole API response if available.
   *
   * @returns {ApiResponseType}
   */
  getApiResponse() {
    return /** @type {ApiResponseType} */ (
      this.isServerDefinedApiError() ? this.data.apiResponse : undefined
    );
  }

  /**
   * Get additional details supplied to the error instance.
   *
   * @returns {{ [x: string]: any }}
   */
  getDetails() {
    return this.data.details;
  }

  /**
   * Set additional details to the error instance.
   *
   * @param {{ [x: string]: any }} details
   */
  setDetails(details) {
    this.data.details = details;
  }

  /**
   * Generate an instance of this class given a JavaScript error.
   *
   * @param {any} error JS error or message.
   * @returns {CdError}
   */
  static generateCdErrorFromJsErrorOrMessage(error) {
    return new CdError({
      type: 'javascript',
      message: error instanceof Error ? error.stack : error,
    });
  }
}

export default CdError;
