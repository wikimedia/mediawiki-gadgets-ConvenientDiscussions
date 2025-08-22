import cd from './shared/cd';

/**
 * @typedef {{ [lang: string]: AnyByKey }} I18n
 */

/**
 * @typedef {object} ConvenientDiscussionsApi
 * @property {import('./commentRegistry').default['getById']} getCommentById
 * @property {import('./commentRegistry').default['getByDtId']} getCommentByDtId
 * @property {import('./sectionRegistry').default['getById']} getSectionById
 * @property {import('./sectionRegistry').default['getByHeadline']} getSectionsByHeadline
 * @property {import('./commentFormRegistry').default['getLastActive']} getLastActiveCommentForm
 * @property {import('./commentFormRegistry').default['getLastActiveAltered']} getLastActiveAlteredCommentForm
 * @property {import('./bootController').default['reboot']} reloadPage
 * @property {import('./bootController').default['getRootElement']} getRootElement
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
 * @property {typeof import('./app').getStringsPromise} getStringsPromise
 */

/**
 * @typedef {import('./shared/cd').ConvenientDiscussionsBase & ConvenientDiscussionsWindowExtension} ConvenientDiscussions
 */

// We change the type here, which is impossible with export...from
// eslint-disable-next-line unicorn/prefer-export-from
export default /** @type {ConvenientDiscussions} */ (cd);
