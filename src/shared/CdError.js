/**
 * Error type:
 * * `'internal'` for errors defined in the script related to the script's internal logic
 * * `'network'` for network errors defined in the script, whether on the client or server
 * * `'api'` for MediaWiki API errors defined on the server
 * * `'response'` for errors defined in the script when there is something wrong with the MediaWiki
 *   API response, excluding MediaWiki API errors defined on the server
 * * `'parse'` for parse errors defined in the script
 * * `'ui'` for UI errors (e.g. when the user does something wrong and we can't handle it silently)
 * * `'javascript'` for JavaScript errors
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
 * @template {ErrorType} [Type=ErrorType]
 * @typedef {object} ErrorDataBase
 * @property {ErrorType} [type='internal']
 * @property {string} [code]
 * @property {AnyByKey} [details={}]
 * @property {string} [message]
 * @property {import('types-mediawiki/mw/Api').ApiResponse} [apiResponse]
 * @property {string} [html]
 */

/**
 * @template {ErrorType} Type
 * @typedef {Expand<
 *   & ErrorDataBase<Type>
 *   & (ErrorDataServerDefinedApiError | ErrorDataResponseError | {})
 * >} ErrorDataParameter
 */

/**
 * @template {ErrorType} Type
 * @typedef {MakeRequired<ErrorDataParameter<Type>, 'type' | 'details'>} ErrorData
 */

/**
 * Script's custom error class.
 *
 * @template {ErrorType} [Type=ErrorType]
 * @augments Error
 */
class CdError extends Error {
  /** @type {ErrorData<ErrorType>} */
  data;

  /**
   * Create a custom error.
   *
   * @param {ErrorDataParameter<Type>} [data={}]
   */
  constructor(data = {}) {
    data.type ??= 'internal';
    data.details ??= {};
    super(
      data.type +
      (data.code ? `/${data.code}` : '') +
      (data.message ? `: ${data.message}` : '')
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
   * @returns {Type}
   */
  getType() {
    return /** @type {Type} */ (this.data.type);
  }

  /**
   * Get the error message.
   *
   * @returns {string | undefined}
   */
  getMessage() {
    return this.data.message;
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
   * @returns {Type extends 'api' ? string : undefined}
   */
  getHtml() {
    return /** @type {Type extends 'api' ? string : undefined} */ (
      this.isServerDefinedApiError() ? this.data.html : undefined
    );
  }

  /**
   * @typedef {(
   *   Type extends 'api'
   *     ? import('types-mediawiki/mw/Api').ApiResponse
   *     : Type extends 'response'
   *       ? import('types-mediawiki/mw/Api').ApiResponse | undefined
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
   * @param {any} error
   * @returns {CdError}
   */
  static generateCdErrorFromJsError(error) {
    return new CdError({
      type: 'javascript',
      message: error instanceof Error ? error.stack : error,
    });
  }
}

export default CdError;
