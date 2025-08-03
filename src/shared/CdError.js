/**
 * Error type:
 * * `'internal'` for errors defined in the script related to the script's internal logic,
 * * `'network'` for network errors defined in the script,
 * * `'api'` for MediaWiki API errors,
 * * `'parse'` for parse errors defined in the script,
 * * `'ui'` for UI errors,
 * * `'javascript'` for JavaScript errors.
 *
 * @typedef {'internal' | 'network' | 'api' | 'parse' | 'ui' | 'javascript'} ErrorType
 */

/**
 * @typedef {object} ErrorDataServerDefinedApiError
 * @property {'api'} type
 * @property {'error'} code
 * @property {import('types-mediawiki/mw/Api').ApiResponse} apiResponse
 * @property {string} apiErrorCode
 */

/**
 * @typedef {object} ErrorDataOkButEmptyError
 * @property {'api'} type
 * @property {'ok-but-empty'} code
 */

/**
 * @typedef {object} ErrorDataLocallyDefined
 * @property {ErrorType} [type='internal'] Error type.
 * @property {string} [code] Error code.
 * @property {string} [message] Error message for the user if they will see it.
 */

/**
 * @typedef {object} ErrorDataCustomProps
 * @property {ApiRejectResponse} [apiResponse] API response.
 * @property {string} [apiErrorCode] API error code.
 * @property {{ [x: string]: any }} [details] Additional details.
 * @property {string} [message] Error message for the user if they will see it.
 */

/**
 * @typedef {Expand<
 *   & (ErrorDataServerDefinedApiError | ErrorDataOkButEmptyError | ErrorDataLocallyDefined)
 *   & ErrorDataCustomProps
 * >} ErrorData
 */

/**
 * Script's custom error class.
 *
 * @augments Error
 */
class CdError extends Error {
  /** @type {Expand<MakeRequired<ErrorData, 'type'>>} */
  data;

  /**
   * Create a custom error.
   *
   * @param {ErrorData} [data={}]
   */
  constructor(data = {}) {
    data.type ??= 'internal';
    super(
      data.type +
      (data.code ? `/${data.code}` : '') +
      (data.apiErrorCode ? `/${data.apiErrorCode}` : '') +
      (data.message ? `: ${data.message}` : '')
    );
    this.name = 'CdError';
    this.data = /** @type {MakeRequired<ErrorData, 'type'>} */ (data);
  }

  /**
   * @returns {this is ErrorDataServerDefinedApiError}
   */
  isServerDefinedApiError() {
    return this.data.type === 'api' && this.data.code !== 'ok-but-empty';
  }
}

export default CdError;
