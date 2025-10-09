import cd from './shared/cd';

/**
 * @typedef {{ [lang: string]: AnyByKey }} I18n
 */

/**
 * @typedef {object} ConvenientDiscussionsApi
 * @property {import('./commentManager').default['getById']} getCommentById
 * @property {import('./commentManager').default['getByDtId']} getCommentByDtId
 * @property {import('./sectionManager').default['getById']} getSectionById
 * @property {import('./sectionManager').default['getByHeadline']} getSectionsByHeadline
 * @property {import('./commentFormManager').default['getLastActive']} getLastActiveCommentForm
 * @property {import('./commentFormManager').default['getLastActiveAltered']} getLastActiveAlteredCommentForm
 * @property {import('./bootManager').default['reboot']} reloadPage
 * @property {import('./bootManager').default['getRootElement']} getRootElement
 */

/**
 * @typedef {object} ConvenientDiscussionsWindowExtension
 * @property {I18n} i18n
 * @property {import('./Comment').default[]} comments
 * @property {import('./Section').default[]} sections
 * @property {import('./settings').default} settings
 * @property {import('./CommentForm').default[]} commentForms
 * @property {ConvenientDiscussionsApi} api
 * @property {boolean} isRunning
 * @property {ReturnType<import('./app').getStringsPromise> | undefined} getStringsPromise
 */

/**
 * @typedef {(
 *     import('./shared/cd').ConvenientDiscussionsBase
 *   & typeof import('./convenientDiscussions').convenientDiscussionsWindow
 *   & ConvenientDiscussionsWindowExtension
 * )} ConvenientDiscussions
 */

// We don't use export...from here because we change the type here, which is impossible with
// export...from
// eslint-disable-next-line unicorn/prefer-export-from
export default /** @type {ConvenientDiscussions} */ (cd);
