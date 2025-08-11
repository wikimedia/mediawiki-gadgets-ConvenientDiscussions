import cd from './shared/cd';

/**
 * @typedef {{ [lang: string]: StringsByKey }} I18n
 */

/**
 * @typedef {object} ConvenientDiscussionsWindowExtension
 * @property {I18n} i18n
 * @property {import('./Comment').default[]} comments
 * @property {import('./Section').default[]} sections
 * @property {import('./settings').default} settings
 * @property {boolean} isRunning
 * @property {typeof import('./app').getStringsPromise} getStringsPromise
 */

/**
 * @typedef {object} ConvenientDiscussionsWorkerExtension
 * @property {CommentWorker[]} comments
 * @property {SectionWorker[]} sections
 */

/**
 * @typedef {import('./shared/cd').ConvenientDiscussionsBase & ConvenientDiscussionsWindowExtension} ConvenientDiscussions
 */

export default /** @type {ConvenientDiscussions} */ (cd);
