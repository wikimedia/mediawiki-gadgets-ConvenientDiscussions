/**
 * Module that returns the {@link convenientDiscussions} object in the relevant context (window or
 * worker).
 *
 * @module cd
 */

/** @type {WindowOrWorkerGlobalScope} */
const context = self;

/**
 * The main script object, globally available (the modules use the {@link module:cd cd} alias).
 *
 * @namespace convenientDiscussions
 * @global
 */
context.convenientDiscussions ||= /** @type {ConvenientDiscussions | ConvenientDiscussionsWorker} */ ({});

/**
 * @typedef {object} ApiErrorFormatHtml
 * @property {string} errorformat
 * @property {any} errorlang
 * @property {boolean} errorsuselocal
 */

/**
 * @typedef {object} GlobalPropertiesExtension
 * @property {string} contentDateFormat Format of date in content language, as used by MediaWiki.
 * @property {string} uiDateFormat Format of date in user (interface) language, as used by
 *   MediaWiki.
 * @property {string} contentDigits Regular expression matching a single digit in content language,
 *   e.g. `[0-9]`.
 * @property {string} uiDigits Regular expression matching a single digit in user (interface)
 *   language, e.g. `[0-9]`.
 * @property {{ [name: string]: string }} contentLanguageMessages
 * @property {{ [name: string]: string[] }} specialPageAliases Some special page aliases in the
 *   wiki's language.
 */

/**
 * @typedef {object} ActionsForStorage
 * @property {string} type
 * @property {string} authFactor
 * @property {string} id
 * @property {string} editMode
 * @property {Date} date
 * @property {(import('./CommentSkeleton').default | import('./SectionSkeleton').default)[]} entities
 * @property {number} index
 * @property {string} section
 */

/**
 * @typedef {object} ReplyCommentResult
 * @property {boolean} success
 * @property {string} id
 * @property {import('./Comment').default} comment
 * @property {boolean} mentioned
 * @property {string} commentUrl
 * @property {boolean} needsRefresh
 */

/**
 * @typedef {object} EditCommentResult
 * @property {boolean} success
 * @property {boolean} modified
 * @property {number} revision
 * @property {number} commentRevision
 * @property {boolean} needsRefresh
 */

/**
 * @typedef {object} MoveCommentResult
 * @property {boolean} success
 * @property {string} commentUrl
 * @property {import('./Comment').default} newComment
 * @property {string} newSection
 */

/**
 * @typedef {object} ConfigCopy
 * @property {boolean} [useTopicSubscription]
 * @property {((...args: any[]) => boolean)} [rejectNode]
 */

/**
 * @typedef {object} ConvenientDiscussionsCommon
 * @property {boolean} [isDesktop]
 * @property {boolean} [autoSignatureWillBePlaced]
 * @property {boolean} [areThereOutdents]
 * @property {{ [language: string]: object }} [dateFormats]
 * @property {Set<string>} [noSignatureClasses]
 * @property {string[]} [badHighlightableElements]
 * @property {string} [commentAnchorsType]
 * @property {import('./CommentSkeleton').default[]} [comments]
 * @property {import('./SectionSkeleton').default[]} [sections]
 * @property {boolean} [commentFormIsOpen]
 * @property {object} [config]
 * @property {{ [name: string]: any }} [g]
 * @property {import('./debug').default} [debug]
 */

/**
 * @typedef {object} ConvenientDiscussionsWindow
 * @property {import('./pageRegistry').default} pageRegistry
 * @property {import('./userRegistry').default} userRegistry
 * @property {import('./commentRegistry').default} commentRegistry
 * @property {import('./sectionRegistry').default} sectionRegistry
 * @property {import('./commentFormRegistry').default} commentFormRegistry
 * @property {import('./CommentFormOperationRegistry').default} commentFormOperationRegistry
 * @property {import('./Comment').default[]} comments
 * @property {import('./Section').default[]} sections
 * @property {import('./Subscriptions').default} subscriptions
 * @property {object} strings
 * @property {object} g
 * @property {import('./debug').default} debug
 * @property {(pagenameOverride?: string) => Promise<boolean>} getOldid
 * @property {(section: import('./SectionSkeleton').default | import('./Section').default) => void} goToSection
 * @property {(callback: Function, waitFor?: number, maxCount?: number) => Promise<import('./utils-general').TruthyItem<any, any>>} waitFor
 * @property {(url: string, title?: string, options?: object) => Promise<boolean>} addSection
 * @property {(target: import('./Comment').default | import('./CommentSkeleton').default | HTMLElement | string, options?: object) => Promise<ReplyCommentResult>} replyToComment
 * @property {(source: import('./Comment').default | string, text: string, options?: object) => Promise<EditCommentResult>} editComment
 * @property {(comment: import('./Comment').default, section: import('./Section').default, summary?: string, options?: object) => Promise<MoveCommentResult>} moveComment
 * @property {(comment: import('./Comment').default | HTMLElement | string, options?: object) => Promise<unknown>} loadFullComment
 * @property {(text: string) => void} showNotification
 * @property {(target: import('./Section').default | import('./Comment').default | HTMLElement | string, options?: object) => void} openReplyForm
 * @property {(username: string, options?: object) => void} mention
 * @property {(page?: string, section?: string) => void} pullChanges
 * @property {() => void} handleKeyUp
 * @property {(configCopy: ConfigCopy, topicId?: string) => void} createSubscription
 * @property {(id: string) => void} removeSubscription
 */

/**
 * @typedef {ConvenientDiscussionsCommon & ConvenientDiscussionsWindow} ConvenientDiscussions
 */

/**
 * @typedef {ConvenientDiscussionsCommon} ConvenientDiscussionsWorker
 */

/**
 * @typedef {import('domhandler').Document} Document
 */

const cd = context.convenientDiscussions;

export default cd;