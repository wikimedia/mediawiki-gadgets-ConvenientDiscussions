import cd from '../shared/cd';

/**
 * @typedef {object} ConvenientDiscussionsWorkerExtension
 * @property {CommentWorker[]} comments
 * @property {SectionWorker[]} sections
 */

/**
 * @typedef {import('../shared/cd').ConvenientDiscussionsBase & ConvenientDiscussionsWorkerExtension} ConvenientDiscussionsWorker
 */

export default /** @type {ConvenientDiscussionsWorker} */ (cd);
