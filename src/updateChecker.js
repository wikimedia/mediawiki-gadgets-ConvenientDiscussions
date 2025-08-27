import Comment from './Comment';
import EventEmitter from './EventEmitter';
import StorageItemWithKeys from './StorageItemWithKeys';
import bootController from './bootController';
import cd from './cd';
import commentFormRegistry from './commentFormRegistry';
import commentRegistry from './commentRegistry';
import sectionRegistry from './sectionRegistry';
import settings from './settings';
import CdError from './shared/CdError';
import { calculateWordOverlap, keepWorkerSafeValues, subtractDaysFromNow } from './shared/utils-general';
import userRegistry from './userRegistry';
import { loadUserGenders } from './utils-api';
import visits from './visits';

// TODO: Make this into a singleton (object) without module-scope variables so that it emits with
// this.emit(). Move worker-related stuff to controller.

/**
 * @typedef {Omit<RemoveMethods<import('./worker/SectionWorker').default>, 'parent'>} SectionWorkerBase
 */

/**
 * @typedef {object} SectionWorkerExtension
 * @property {import('./Section').default} [match]
 * @property {number} [matchScore]
 * @property {number} [tocLevel]
 * @property {import('./worker/SectionWorker').default|SectionWorkerMatched} [parent]
 */

/**
 * @typedef {SectionWorkerBase & SectionWorkerExtension} SectionWorkerMatched
 */

/**
 * @typedef {object} CommentWorkerExtension
 * @property {import('./User').default} author
 * @property {SectionWorkerMatched} [section]
 * @property {CommentWorkerMatched} [match]
 * @property {import('./Comment').default} [parentMatch]
 * @property {number} [matchScore]
 * @property {boolean} [hasPoorMatch]
 * @property {CommentWorkerMatched} parent
 * @property {CommentWorkerMatched[]} children
 * @property {CommentWorkerMatched[]} previousComments
 * @property {import('./Section').default} sectionSubscribedTo
 */

/**
 * @typedef {Omit<RemoveMethods<import('./worker/CommentWorker').default>, 'children' | 'previousComments'>} CommentWorkerBase
 */

/**
 * @typedef {CommentWorkerBase & CommentWorkerExtension} CommentWorkerMatched
 */

/**
 * @typedef {object} RevisionData
 * @property {number} revisionId
 * @property {CommentWorkerMatched[]} comments
 * @property {SectionWorkerMatched[]} sections
 */

/**
 * @typedef {object[]} ChangesList
 * @param {import('./Comment').default} comment
 * @param {object} commentsData
 */

/**
 * @typedef {object} AddedComments
 * @property {import('./updateChecker').CommentWorkerMatched[]} all
 * @property {import('./updateChecker').CommentWorkerMatched[]} relevant
 * @property {Map<import('./updateChecker').SectionWorkerMatched | null, import('./updateChecker').CommentWorkerMatched[]>} bySection
 */

/**
 * @typedef {object} EventMap
 * @property {[number]} check
 * @property {[SectionWorkerMatched[]]} sectionsUpdate
 * @property {[ChangesList]} newChanges
 * @property {[AddedComments]} commentsUpdate
 */

/**
 * Object type with numeric and named indexes for comparing comments. Different indexes are used to
 * supply one object both to the event and to Comment#markAsChanged().
 *
 * @typedef {{
 *   current: CommentWorkerMatched
 *   old?: CommentWorkerMatched
 *   new?: CommentWorkerMatched
 *   0: CommentWorkerMatched
 *   1?: CommentWorkerMatched
 * }} CommentsData
 */

/**
 * Singleton responsible for polling for updates of the page in the background.
 *
 * @augments EventEmitter<EventMap>
 */
class UpdateChecker extends EventEmitter {
  /** @type {Map<number, MessageFromWorkerParse | RevisionData>} */
  revisionData = new Map();

  /** @type {{ [key: number]: (value: any) => void }} */
  resolvers = {};

  isBackgroundCheckArranged = false;

  /** @type {number|undefined} */
  previousVisitRevisionId = undefined;

  /** @type {number|undefined} */
  lastCheckedRevisionId = undefined;

  resolverCount = 0;
  initted = false;

  /**
   * Tell the worker to wake the script up after a given interval.
   *
   * Chrome and probably other browsers throttle background tabs. To bypass this, we use the web
   * worker to wake the script up when we say, making it work as an alarm clock.
   *
   * @param {number} interval
   * @private
   */
  setAlarmViaWorker(interval) {
    if (Number.isNaN(Number(interval))) return;

    cd.getWorker().postMessage({
      type: 'setAlarm',
      interval,
    });
  }

  /**
   * Remove an alarm set in `setAlarmViaWorker()`.
   *
   * @private
   */
  removeAlarmViaWorker() {
    cd.getWorker().postMessage({
      type: 'removeAlarm',
    });
  }

  /**
   * Perform a task in the web worker.
   *
   * @param {object} payload
   * @returns {Promise.<MessageFromWorkerParse | undefined>}
   * @private
   */
  runWorkerTask(payload) {
    return new Promise((resolve) => {
      const resolverId = this.resolverCount++;
      cd.getWorker().postMessage(Object.assign(payload, { resolverId }));
      this.resolvers[resolverId] = resolve;
    });
  }

  /**
   * Process the current page in the web worker. If this was already done for an revision, take its
   * data from cache.
   *
   * @param {number} [revisionToParseId]
   * @returns {Promise<MessageFromWorkerParse | RevisionData>}
   */
  async processPage(revisionToParseId) {
    if (typeof revisionToParseId === 'number' && this.revisionData.has(revisionToParseId)) {
      return /** @type {RevisionData} */ (this.revisionData.get(revisionToParseId));
    }

    const { text, revid: revisionId } = await cd.page.parse({ oldid: revisionToParseId }, true);

    const message = /** @type {MessageFromWorkerParse} */ (
      await this.runWorkerTask({
        type: 'parse',
        revisionId,
        text,
        g: keepWorkerSafeValues(cd.g, ['isIPv6Address']),
        config: keepWorkerSafeValues(cd.config, ['rejectNode']),
      })
    );

    if (!this.revisionData.has(message.revisionId)) {
      this.revisionData.set(message.revisionId, message);
    }

    // Clean up revisionData from values that can't be reused as it may grow really big. (The newest
    // revision could be reused as a current revision; the current revision could be reused as a
    // previous visit revision.)
    this.revisionData.keys().forEach((revId) => {
      if (
        revId !== message.revisionId &&
        revId !== this.lastCheckedRevisionId &&
        revId !== this.previousVisitRevisionId &&
        revId !== mw.config.get('wgRevisionId')
      ) {
        this.revisionData.delete(revId);
      }
    });

    return message;
  }

  /**
   * If the revision of the current visit and previous visit are different, process the said
   * revisions. (We need to process the current revision too to get the comments' inner HTML without
   * any elements that may be added by scripts.) The revisions' data will be finally processed by
   * `checkForChangesSincePreviousVisit()`.
   *
   * @param {number} previousVisitTime
   * @param {string} [submittedCommentId]
   * @private
   */
  async maybeProcessRevisionsAtLoad(previousVisitTime, submittedCommentId) {
    const revisions = await cd.page.getRevisions({
      rvprop: ['ids'],
      rvstart: new Date(previousVisitTime * 1000).toISOString(),
      rvlimit: 1,
    }, true);
    this.previousVisitRevisionId = revisions[0]?.revid;
    const currentRevisionId = mw.config.get('wgRevisionId');

    if (this.previousVisitRevisionId && this.previousVisitRevisionId < currentRevisionId) {
      const { comments: oldComments } = await this.processPage(this.previousVisitRevisionId);
      const { comments: currentComments } = await this.processPage(currentRevisionId);
      if (this.isPageStillAtRevision(currentRevisionId)) {
        this.mapWorkerCommentsToWorkerComments(currentComments, oldComments);
        this.checkForChangesSincePreviousVisit(
          /** @type {CommentWorkerMatched[]} */ (currentComments),
          this.previousVisitRevisionId,
          submittedCommentId
        );
      }
    }
  }

  /**
   * Map sections obtained from a revision to the sections present on the rendered page. (Contrast
   * with `UpdateChecker#mapWorkerCommentsToWorkerComments` which maps CommentWorker objects
   * together.)
   *
   * @param {import('./worker/SectionWorker').default[] | SectionWorkerMatched[]} workerSections
   * @param {number} lastCheckedRevisionId
   * @private
   */
  mapWorkerSectionsToSections(workerSections, lastCheckedRevisionId) {
    if (this.areWorkerSectionsMatched(workerSections)) return;

    // Reset values set in the previous run.
    sectionRegistry.getAll().forEach((section) => {
      delete section.match;
      delete section.matchScore;
    });

    workerSections.forEach((workerSection) => {
      const match = sectionRegistry.search(workerSection);
      if (match) {
        const { section, score } = match;
        if ((section.matchScore === undefined || match.score > section.matchScore)) {
          if (section.match) {
            delete section.match.match;
          }
          section.match = workerSection;
          section.matchScore = score;
          /** @type {SectionWorkerMatched} */ (workerSection).match = section;
        }
      }
    });

    sectionRegistry.getAll().forEach((section) => {
      section.cleanUpLiveData(lastCheckedRevisionId);
    });
  }

  /**
   * Check if section instances received from the web worker were previously matched to the sections
   * present on the rendered page (if they were taken from cache) so that we don't do the same
   * again.
   *
   * @param {import('./worker/SectionWorker').default[] | SectionWorkerMatched[]} sections
   * @returns {sections is SectionWorkerMatched[]}
   */
  areWorkerSectionsMatched(sections) {
    return sections.some((section) => 'match' in section);
  }

  /**
   * Sort comments by match score, removing comments with score of 1.66 or less.
   *
   * @param {CommentWorkerMatched[]} candidates
   * @param {CommentWorkerMatched} target
   * @param {boolean} isTotalCountEqual
   * @returns {{
   *   comment: CommentWorkerMatched;
   *   score: number;
   * }[]}
   * @private
   */
  sortCommentsByMatchScore(candidates, target, isTotalCountEqual) {
    return candidates
      .map((candidate) => {
        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const doesParentIdMatch = candidate.parent?.id === target.parent?.id;
        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const doesHeadlineMatch = candidate.section?.headline === target.section?.headline;

        // Taking matched ID into account makes sense only if the total number of comments coincides.
        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const doesIndexMatch = candidate.index === target.index && isTotalCountEqual;

        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const partsMatchedCount = candidate.elementHtmls
          .filter((html, i) => html === target.elementHtmls[i])
          .length;
        const partsMatchedProportion = (
          partsMatchedCount /
          Math.max(candidate.elementHtmls.length, target.elementHtmls.length)
        );
        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const overlap = partsMatchedProportion === 1
          ? 1
          : calculateWordOverlap(candidate.text, target.text);

        return {
          comment: candidate,
          score:
            Number(doesParentIdMatch) * (candidate.parent?.id ? 1 : 0.75) +
            Number(doesHeadlineMatch) * 1 +
            partsMatchedProportion +
            overlap +
            Number(doesIndexMatch) * 0.25,
        };
      })
      .filter((match) => match.score > 1.66)
      .sort((match1, match2) => match2.score - match1.score);
  }

  /**
   * Map comments obtained from the current revision to comments obtained from another revision
   * (newer or older) by adding the `match` property to the first ones. (Contrast with
   * `updateChecker#mapWorkerSectionsToSections` which maps SectionWorker objects to actual sections
   * on the page.)
   *
   * The function also adds the `hasPoorMatch` property to comments that have possible matches that
   * are not good enough to confidently state a match.
   *
   * @param {import('./worker/CommentWorker').default[] | CommentWorkerMatched[]} currentComments
   * @param {import('./worker/CommentWorker').default[] | CommentWorkerMatched[]} otherComments
   * @private
   */
  mapWorkerCommentsToWorkerComments(currentComments, otherComments) {
    if (!this.areCommentsEnriched(currentComments) || !this.areCommentsEnriched(otherComments)) {
      return;
    }

    // currentComments and otherComments could contain simple CommentWorker types from
    // CommentWorker, not CommentWorkerEnriched, but for simplicity let's treat them as
    // CommentWorkerEnriched.

    // Reset values set in the previous run ("derich").
    currentComments.forEach((comment) => {
      delete comment.match;
      delete comment.matchScore;
      delete comment.hasPoorMatch;
      delete comment.parentMatch;
    });

    otherComments.forEach((otherComment) => {
      delete otherComment.match;
    });

    // We choose to traverse "other" (newer/older) comments in the top cycle, and current comments in
    // the bottom cycle, not vice versa.
    otherComments.forEach((otherComment) => {
      const ccFiltered = currentComments.filter(
        (currentComment) =>
          currentComment.authorName === otherComment.authorName &&
          currentComment.date &&
          otherComment.date &&
          currentComment.date.getTime() === otherComment.date.getTime()
      );
      const isTotalCountEqual = currentComments.length === otherComments.length;
      if (ccFiltered.length === 1) {
        ccFiltered[0].match = ccFiltered[0].match
          ? this.sortCommentsByMatchScore(
              [ccFiltered[0].match, otherComment],
              ccFiltered[0],
              isTotalCountEqual
            )[0].comment
          : otherComment;
      } else if (ccFiltered.length > 1) {
        /** @type {boolean} */
        let found;
        this.sortCommentsByMatchScore(ccFiltered, otherComment, isTotalCountEqual).forEach((match) => {
          // If the current comment already has a match (from a previous iteration of the
          // otherComments cycle), compare their scores.
          if (!found && (!match.comment.matchScore || match.comment.matchScore < match.score)) {
            match.comment.match = otherComment;
            match.comment.matchScore = match.score;
            delete match.comment.hasPoorMatch;
            found = true;
          } else {
            if (!match.comment.match) {
              // There is a poor match for a current comment.
              match.comment.hasPoorMatch = true;
            }
          }
        });
      }
    });
  }

  /**
   * Check if comment instances received from the web worker were previously enriched by this class.
   *
   * @param {import('./worker/CommentWorker').default[] | CommentWorkerMatched[]} comments
   * @returns {comments is CommentWorkerMatched[]}
   */
  areCommentsEnriched(comments) {
    return Boolean(
      comments.length &&
      ('match' in comments[0] || 'hasPoorMatch' in comments[0] || 'parentMatch' in comments[0])
    );
  }

  /**
   * Check for new comments in the web worker, update the navigation panel, and schedule the next
   * check.
   *
   * @private
   */
  async checkForUpdates() {
    if (!cd.page.isActive() || bootController.isBooting()) return;

    // We need a value that wouldn't change during `await`s.
    const documentHidden = document.hidden;

    if (documentHidden && !this.isBackgroundCheckArranged) {
      $(document).one('visibilitychange', () => {
        this.isBackgroundCheckArranged = false;
        this.removeAlarmViaWorker();
        this.checkForUpdates();
      });

      this.setAlarmViaWorker(
        Math.abs(cd.g.backgroundUpdateCheckInterval - cd.g.updateCheckInterval) * 1000
      );
      this.isBackgroundCheckArranged = true;
      return;
    }

    try {
      const revisions = await cd.page.getRevisions({
        rvprop: ['ids'],
        rvlimit: 1,
      }, true);

      const currentRevisionId = mw.config.get('wgRevisionId');
      if (
        revisions.length &&
        revisions[0].revid > (this.lastCheckedRevisionId || currentRevisionId)
      ) {
        const { revisionId, comments: newComments, sections } = await this.processPage();
        if (this.isPageStillAtRevision(currentRevisionId)) {
          const { comments: currentComments } = await this.processPage(currentRevisionId);

          // We set the value here, not after the first `await`, so that we are sure that
          // lastCheckedRevisionId corresponds to the versions of comments that are currently
          // rendered.
          this.lastCheckedRevisionId = revisionId;
          this.emit('check', revisionId);

          if (this.isPageStillAtRevision(currentRevisionId)) {
            this.mapWorkerSectionsToSections(sections, revisionId);
            this.mapWorkerCommentsToWorkerComments(currentComments, newComments);

            this.emit('sectionsUpdate', /** @type {SectionWorkerMatched[]} */ (sections));

            // We check for changes before notifying about new comments to notify about changes in
            // renamed sections if any were watched.
            this.checkForNewChanges(
              /** @type {CommentWorkerMatched[]} */ (currentComments),
              revisionId
            );

            await this.processComments(
              /** @type {CommentWorkerMatched[]} */ (newComments),
              /** @type {CommentWorkerMatched[]} */ (currentComments),
              currentRevisionId
            );
          }
        }
      }
    } catch (error) {
      if (!(error instanceof CdError) || error.getCode() !== 'network') {
        console.warn(error);
      }
    }

    if (documentHidden) {
      this.setAlarmViaWorker(cd.g.backgroundUpdateCheckInterval * 1000);
      this.isBackgroundCheckArranged = true;
    } else {
      this.setAlarmViaWorker(cd.g.updateCheckInterval * 1000);
    }
  }

  /**
   * Determine if the comment has changed (probably edited) based on the `textHtmlToCompare` and
   * `headingHtmlToCompare` properties (the comment may lose its heading because technical comment is
   * added between it and the heading).
   *
   * @param {CommentWorkerMatched} olderComment
   * @param {CommentWorkerMatched} newerComment
   * @returns {boolean}
   * @private
   */
  hasCommentChanged(olderComment, newerComment) {
    return Boolean(
      newerComment.textHtmlToCompare !== olderComment.textHtmlToCompare ||
      (
        newerComment.headingHtmlToCompare &&
        newerComment.headingHtmlToCompare !== olderComment.headingHtmlToCompare
      )
    );
  }

  /**
   * Check if there are changes made to the currently displayed comments since the previous visit.
   *
   * @param {CommentWorkerMatched[]} currentComments
   * @param {number} previousVisitRevisionId
   * @param {string} [submittedCommentId]
   * @private
   */
  checkForChangesSincePreviousVisit(currentComments, previousVisitRevisionId, submittedCommentId) {
    const seenStorageItem = /** @type {import('./StorageItemWithKeys').default} */ (new StorageItemWithKeys('seenRenderedChanges'))
      .cleanUp((entry) =>
        (Math.min(...Object.values(entry).map((data) => data.seenTime)) || 0) <
        subtractDaysFromNow(60)
      );
    const seen = seenStorageItem.get(mw.config.get('wgArticleId'));

    const changeList = /** @type {ChangesList} */ ([]);
    const markAsChangedData = /** @type {MarkAsChangedData[]} */ ([]);
    currentComments.forEach((currentComment) => {
      if (currentComment.id === submittedCommentId) return;

      const oldComment = currentComment.match;
      if (
        oldComment &&
        this.hasCommentChanged(oldComment, currentComment) &&

        // Seen the comment in this edition?
        (
          !currentComment.id ||
          seen?.[currentComment.id]?.htmlToCompare !== currentComment.htmlToCompare
        )
      ) {
        const comment = commentRegistry.getById(currentComment.id);
        if (!comment) return;

        /** @type {CommentsData} */
        const commentsData = {
          old: oldComment,
          current: currentComment,
          0: oldComment,
          1: currentComment,
        };

        markAsChangedData.push({
          comment,
          isNewRevisionRendered: true,
          comparedRevisionId: previousVisitRevisionId,
          commentsData,
        });

        if (comment.isOpeningSection()) {
          comment.section.resubscribeIfRenamed(currentComment, oldComment);
        }

        changeList.push({ comment, commentsData });
      }
    });

    this.markCommentsAsChanged(
      'changedSince',
      markAsChangedData,
      previousVisitRevisionId,
      mw.config.get('wgRevisionId')
    );

    if (changeList.length) {
      /**
       * Existing comments have changed since the previous visit.
       *
       * @event changesSincePreviousVisit
       * @param {ChangesList} changeList
       * @global
       */
      mw.hook('convenientDiscussions.changesSincePreviousVisit').fire(changeList);
    }

    seenStorageItem
      .remove(mw.config.get('wgArticleId'))
      .save();
  }

  /**
   * Check if there are changes made to the currently displayed comments since they were rendered.
   *
   * @param {CommentWorkerMatched[]} currentComments
   * @param {number} lastCheckedRevisionId
   * @private
   */
  checkForNewChanges(currentComments, lastCheckedRevisionId) {
    const changeList = /** @type {ChangesList} */ ([]);
    const markAsChangedData = /** @type {MarkAsChangedData[]} */ ([]);
    currentComments.forEach((currentComment) => {
      const newComment = currentComment.match;
      let comment;
      const events = {};

      /** @type {CommentsData} */
      const commentsData = {
        current: currentComment,
        new: newComment,
        0: currentComment,
        1: newComment,
      };

      if (newComment) {
        comment = commentRegistry.getById(currentComment.id);
        if (!comment) return;

        if (comment.isDeleted) {
          comment.unmarkAsChanged('deleted');
          events.undeleted = true;
        }
        if (this.hasCommentChanged(currentComment, newComment)) {
          // The comment may have already been updated previously.
          if (!comment.htmlToCompare || comment.htmlToCompare !== newComment.htmlToCompare) {
            const updateSuccess = comment.update(currentComment, newComment);
            markAsChangedData.push({
              comment,
              isNewRevisionRendered: updateSuccess,
              comparedRevisionId: lastCheckedRevisionId,
              commentsData,
            });
            events.changed = { updateSuccess };
          }
        } else if (comment.isChanged) {
          comment.update(currentComment, newComment);
          comment.unmarkAsChanged('changed');
          events.unchanged = true;
        }
      } else if (!currentComment.hasPoorMatch) {
        comment = commentRegistry.getById(currentComment.id);
        if (!comment || comment.isDeleted) return;

        comment.markAsChanged('deleted');
        events.deleted = true;
      }

      if (Object.keys(events).length) {
        changeList.push({ comment, events, commentsData });
      }
    });

    this.markCommentsAsChanged(
      'changed',
      markAsChangedData,
      mw.config.get('wgRevisionId'),
      lastCheckedRevisionId
    );

    if (changeList.length) {
      this.emit('newChanges', changeList);

      /**
       * Existing comments have changed (probably edited).
       *
       * @event newChanges
       * @param {object[]} changeList
       * @param {import('./Comment').default} changeList.comment
       * @param {object} changeList.events
       * @param {object} [changeList.events.changed]
       * @param {boolean} [changeList.events.changed.updateSuccess] Were the changes rendered.
       * @param {boolean} [changeList.events.unchanged]
       * @param {boolean} [changeList.events.deleted]
       * @param {boolean} [changeList.events.undeleted]
       * @param {CommentsData} changeList.commentsData
       * @global
       */
      mw.hook('convenientDiscussions.newChanges').fire(changeList);
    }
  }

  /**
   * Data needed to mark the comment as changed
   *
   * @typedef {object} MarkAsChangedData
   * @property {import('./Comment').default} comment
   * @property {boolean} isNewRevisionRendered
   * @property {number} comparedRevisionId
   * @property {CommentsData} commentsData
   * @private
   */

  /**
   * Mark comments as changed, verifying diffs if possible to decide whether to show the diff link.
   *
   * @param {'changed' | 'changedSince'} type
   * @param {MarkAsChangedData[]} data
   * @param {number} olderRevisionId
   * @param {number} newerRevisionId
   */
  async markCommentsAsChanged(type, data, olderRevisionId, newerRevisionId) {
    if (!data.length) return;

    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const revisionIdAtStart = mw.config.get('wgRevisionId');

    // Don't process >20 diffs, that's too much and probably means something is broken
    const verifyDiffs = (
      data.length <= 20 &&
      data.some(({ comment }) => comment.getSourcePage().isCurrent())
    );

    /** @type {Revision<['content']>[]} */
    let revisions;
    /** @type {string|undefined} */
    let compareBody;
    if (verifyDiffs) {
      try {
        revisions = await cd.page.getRevisions({
          revids: [olderRevisionId, newerRevisionId],
          rvprop: ['content'],
        });
        compareBody = await cd.page.compareRevisions(olderRevisionId, newerRevisionId);
      } catch {
        // Empty
      }
    }
    if (!this.isPageStillAtRevision(revisionIdAtStart)) return;

    data.forEach(({ comment, isNewRevisionRendered, comparedRevisionId, commentsData }) => {
      if (
        !verifyDiffs ||
        compareBody === undefined ||
        revisions === undefined ||
        comment
          .scrubDiff(compareBody, revisions, commentsData)
          .find('.diff-deletedline, .diff-addedline').length
      ) {
        comment.markAsChanged(type, isNewRevisionRendered, comparedRevisionId, commentsData);
      }
    });
  }

  /**
   * Check if the page is still at the specified revision and nothing is loading.
   *
   * @param {number} revisionId
   * @returns {boolean}
   * @private
   */
  isPageStillAtRevision(revisionId) {
    return (
      revisionId === mw.config.get('wgRevisionId') &&
      !bootController.isBooting() &&
      !commentFormRegistry.getAll().some((commentForm) => commentForm.isBeingSubmitted())
    );
  }

  /**
   * Process comments retrieved by the web worker.
   *
   * @param {CommentWorkerMatched[]} comments Comments in the recent revision.
   * @param {CommentWorkerMatched[]} currentComments Comments in the currently shown revision mapped
   *   to the comments in the recent revision.
   * @param {number} currentRevisionId ID of the revision that can be seen on the page.
   * @private
   */
  async processComments(comments, currentComments, currentRevisionId) {
    comments.forEach((comment) => {
      comment.author = userRegistry.get(comment.authorName);
      if (comment.parent?.authorName) {
        comment.parent.author = userRegistry.get(comment.parent.authorName);
      }
    });

    const all = /** @type {CommentWorkerMatched[]} */ (comments
      .filter((comment) => comment.id && !currentComments.some((mcc) => mcc.match === comment))
      // Detach comments in the newComments object from those in the `comments` object.
      .map((comment) => {
        const newComment = { ...comment };
        if (comment.parent) {
          const parentMatch = currentComments.find((mcc) => mcc.match === comment.parent);
          if (parentMatch?.id) {
            newComment.parentMatch = commentRegistry.getById(parentMatch.id) || undefined;
          }
        }

        return newComment;
      }));

    if (cd.g.genderAffectsUserString) {
      await loadUserGenders(all.map((comment) => comment.author), true);
    }
    if (!this.isPageStillAtRevision(currentRevisionId)) return;

    this.emit('commentsUpdate', {
      all,
      relevant: /** @type {CommentWorkerMatched[]} */ (all
        .filter((comment) => {
          if (!settings.get('notifyCollapsedThreads') && comment.logicalLevel !== 0) {
            let parentMatch;
            for (let c = comment; c && !parentMatch; c = c.parent) {
              parentMatch = c.parentMatch;
            }
            if (parentMatch?.isCollapsed) {
              return false;
            }
          }
          if (comment.isOwn || comment.author.isMuted()) {
            return false;
          }
          if (comment.isToMe) {
            return true;
          }
          if (comment.section) {
            // Is this section subscribed to by means of an upper level section?
            const section = comment.section.match;
            if (section) {
              const closestSectionSubscribedTo = section.getClosestSectionSubscribedTo(true);
              if (closestSectionSubscribedTo) {
                comment.sectionSubscribedTo = closestSectionSubscribedTo;

                return true;
              }
            }
          }

          return false;
        })),
      bySection: Comment.groupBySection(all),
    });
  }

  /**
   * Callback for messages from the worker.
   *
   * @param {MessageEvent} event
   * @private
   */
  onMessageFromWorker = async (event) => {
    const message = event.data;

    if (message.type === 'wakeUp') {
      this.checkForUpdates();
    } else {
      const resolverId = message.resolverId;
      delete message.resolverId;
      delete message.type;
      this.resolvers[resolverId](message);
      delete this.resolvers[resolverId];
    }
  };

  /**
   * _For internal use._ Initialize the update checker.
   */
  init() {
    visits
      .on('process', (/** @type {string[]} */ currentPageData) => {
        const bootProcess = bootController.getBootProcess();
        this.setup(
          currentPageData.length >= 2 ?
            Number(currentPageData[currentPageData.length - 2]) :
            undefined,
          (
            (
              bootProcess.passedData.submittedCommentForm &&
              bootProcess.passedData.commentIds?.[0]
            ) ||
            undefined
          )
        );
        this.initted = true;
      });
  }

  /**
   * _For internal use._ Set up the update checker. Executed on each page reload.
   *
   * @param {number} [previousVisitTime]
   * @param {string} [submittedCommentId]
   */
  async setup(previousVisitTime, submittedCommentId) {
    this.isBackgroundCheckArranged = false;
    this.previousVisitRevisionId = undefined;
    if (this.initted) {
      this.removeAlarmViaWorker();
    } else {
      cd.getWorker().addEventListener('message', this.onMessageFromWorker);
    }
    this.setAlarmViaWorker(cd.g.updateCheckInterval * 1000);
    if (previousVisitTime) {
      this.maybeProcessRevisionsAtLoad(previousVisitTime, submittedCommentId);
    }
  }
}

const updateChecker = new UpdateChecker();

export default updateChecker;
export const processPage = updateChecker.processPage.bind(updateChecker);
