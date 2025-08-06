/**
 * Error type:
 * * `'internal'` for errors defined in the script related to the script's internal logic
 * * `'network'` for network errors defined in the script, whether on the client or server
 * * `'api'` for MediaWiki API errors
 * * `'server'` for server errors defined in the script (currently only `'ok-but-empty'`)
 * * `'parse'` for parse errors defined in the script
 * * `'ui'` for UI errors (e.g. when the user does something wrong and we can't handle it silently)
 * * `'javascript'` for JavaScript errors
 *
 * @typedef {'internal' | 'network' | 'api' | 'server' | 'parse' | 'ui' | 'javascript'} ErrorType
 */

/**
 * @typedef {object} ErrorDataServerDefinedApiError
 * @property {'api'} type
 * @property {string} code
 * @property {import('types-mediawiki/mw/Api').ApiResponse} apiResponse
 * @property {string} html
 */

/**
 * @typedef {object} ErrorDataOkButEmptyError
 * @property {'server'} type
 * @property {'ok-but-empty'} code
 */

/**
 * @template {ErrorType} [Type='internal']
 * @typedef {object} ErrorDataBase
 * @property {ErrorType} [type='internal']
 * @property {string} [code]
 * @property {{ [x: string]: any }} [details]
 * @property {string} [message]
 */

/**
 * @template {ErrorType} Type
 * @typedef {Expand<
 *   & ErrorDataBase<Type>
 *   & (ErrorDataServerDefinedApiError | ErrorDataOkButEmptyError | {})
 * >} ErrorData
 */

/**
 * Script's custom error class.
 *
 * @template {ErrorType} [Type='internal']
 * @augments Error
 */
class CdError extends Error {
  /** @type {MakeRequired<ErrorData<Type>, 'type'>} */
  data;

  /**
   * Create a custom error.
   *
   * @param {ErrorData<Type>} [data={}]
   */
  constructor(data = {}) {
    data.type ??= 'internal';
    super(
      data.type +
      (data.code ? `/${data.code}` : '') +
      (data.message ? `: ${data.message}` : '')
    );
    this.name = 'CdError';
    this.data = /** @type {MakeRequired<ErrorData<Type>, 'type'>} */ (data);
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
   * Get the whole API response if available.
   *
   * @returns {Type extends 'api' ? ApiRejectResponse : undefined}
   */
  getApiResponse() {
    return /** @type {Type extends 'api' ? ApiRejectResponse : undefined} */ (
      this.isServerDefinedApiError() ? this.data.apiResponse : undefined
    );
  }
}

export default CdError;
