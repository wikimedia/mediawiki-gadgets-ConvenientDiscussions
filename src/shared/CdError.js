/**
 * @typedef {object} ErrorData
 * @property {'network'|'api'|'parse'|'internal'} [type='internal'] Error type/category.
 * @property {string} [code] Error code.
 * @property {ApiRejectResponse} [apiResponse] API response.
 * @property {string} [apiError] API error code.
 * @property {{ [x: string]: any }} [details] Additional details.
 * @property {string} [message] Error message for the user if they will see it.
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
      (data.apiError ? `/${data.apiError}` : '') +
      (data.message ? `: ${data.message}` : '')
    );
    this.name = 'CdError';
    this.data = /** @type {MakeRequired<ErrorData, 'type'>} */ (data);
  }
}

export default CdError;
