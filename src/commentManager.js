import Comment from './Comment';
import EventEmitter from './EventEmitter';
import StorageItemWithKeys from './StorageItemWithKeys';
import Thread from './Thread';
import bootManager from './bootManager';
import cd from './cd';
import commentFormManager from './commentFormManager';
import settings from './settings';
import TreeWalker from './shared/TreeWalker';
import { definedAndNotNull, reorderArray, sleep, subtractDaysFromNow, unique } from './shared/utils-general';
import talkPageController from './talkPageController';
import updateChecker from './updateChecker';
import { getPagesExistence } from './utils-api';
import { getCommonGender, getExtendedRect, getHigherNodeAndOffsetInSelection } from './utils-window';
import visits from './visits';

// TODO: Make it extend a generic registry.

/**
 * @typedef {object} EventMap
 * @property {[]} registerSeen
 * @property {[Comment]} unselect
 * @property {[Comment]} select
 */

/**
 * Singleton storing data about comments on the page and managing them.
 *
 * @augments EventEmitter<EventMap>
 */
class CommentManager extends EventEmitter {
  /**
   * List of comments.
   *
   * @type {Comment[]}
   * @private
   */
  items = [];

  /**
   * List of underlays.
   *
   * @type {Element[]}
   */
  underlays = [];

  /**
   * List of containers of layers.
   *
   * @type {Element[]}
   */
  layersContainers = [];

  /**
   * @typedef {object} ThanksData
   * @property {string} [id] TODO: Remove after migration is complete on December 1, 2025
   * @property {number} thankTime
   */

  /**
   * @type {StorageItemWithKeys<ThanksData>}
   * @private
   */
  thanksStorage;

  /**
   * _For internal use._ Initialize the registry.
   */
  init() {
    this.reformatCommentsSetting = settings.get('reformatComments');

    this.thanksStorage = new StorageItemWithKeys('thanks')
      .cleanUp((entry) => (entry.thankTime || 0) < subtractDaysFromNow(60))
      .save();

    talkPageController
      .on('scroll', this.registerSeen.bind(this))
      .on('mutate', this.maybeRedrawLayers.bind(this))
      .on('resize', this.maybeRedrawLayers.bind(this))
      .on('mouseMove', this.maybeHighlightHovered.bind(this))
      .on('popState', (fragment) => {
        // Don't jump to the comment if the user pressed "Back"/"Forward" in the browser or if
        // history.pushState() is called from Comment#scrollTo() (after clicks on added (gray)
        // items in the TOC). A marginal state of this happening is when a page with a comment ID in
        // the fragment is opened and then a link with the same fragment is clicked.
        if (!Comment.isAnyId(fragment) || history.state?.cdJumpedToComment) return;

        this.getByAnyId(fragment, true)?.scrollTo();
      })
      .on('selectionChange', this.getSelectedComment.bind(this))
      .on('beforeReboot', (passedData) => {
        // Stop all animations, clear all timeouts.
        this.items.forEach((comment) => {
          comment.stopAnimations();
        });

        // If the page is reloaded externally, its content is already replaced, so we won't break
        // anything if we remove the layers containers early. And we better do so to avoid comment
        // layers hanging around without their owner comments.
        if (passedData.isPageReloadedExternally) {
          this.resetLayers();
        }
      })
      .on('startReboot', this.resetLayers.bind(this))
      .on('desktopNotificationClick', this.maybeRedrawLayers.bind(this, true));
    visits
      .on('process', this.registerSeen.bind(this))
      .on('process', async () => {
        // A workaround to fight the bug in Chromium where comments layers are misplaced after page
        // load. I couldn't establish the cause of it - comment positions are rechecked on events
        // and also periodically, and if a comment is moved, it's layers are redrawn. But then these
        // positions are cached, and if nothing seems to be changed, we don't recheck _all_ comment
        // positions every time. Probably there is some misalignment between how the browser renders
        // the positions and how it reports the changes (e.g. it updates the positions of elements
        // at the top and bottom of the page separately). UPDATE: the cause could be just below: the
        // event handler of updateChecker's newChanges event ran earlier than the handler attached
        // in Thread.init(). So, threads were being collapsed just after comment layers were
        // redrawn.
        await sleep(2000);
        this.maybeRedrawLayers(true);
      });
    updateChecker
      // If the layers of deleted comments have been configured in Comment#unmarkAsChanged(), they
      // will prevent layers before them from being updated due to the "stop at the first three
      // unmoved comments" optimization in .maybeRedrawLayers(). So we just do the whole job here.
      .on('newChanges', async () => {
        // This should run after Thread.init() that also reacts to the newChanges event.
        await sleep();

        this.maybeRedrawLayers(true);
      })
      .on('commentsUpdate', ({ all }) => {
        this.addNewCommentsNotes(all);
      });
    commentFormManager
      .on('teardown', this.registerSeen.bind(this));
    Thread
      .on('init', this.addToggleChildThreadsButtons.bind(this));
  }

  /**
   * _For internal use._ Perform some comment-related operations when the registry is filled, in
   * addition to those performed when each comment is added to the registry.
   */
  setup() {
    // This can be updated after an in-script page reload if the user agrees to this setting in the
    // onboarding popup (settings.maybeSuggestEnableCommentReformatting()).
    this.reformatCommentsSetting = settings.get('reformatComments');

    this.reformatTimestamps();
    this.findAndUpdateTableComments();
    this.adjustDom();

    // Our handler may run earlier than DT's (e.g. in Chrome if the page was loaded in a background
    // tab). This hack seems to work better than adding and removing a `wikipage.content` hook.
    $(this.handleDtTimestampsClick.bind(this));
  }

  /**
   * Add a comment to the list.
   *
   * @param {Comment} item
   */
  add(item) {
    this.items.push(item);
  }

  /**
   * Get all comments on the page ordered the same way as in the DOM. It returns the original array,
   * so use `.slice()` when changing it.
   *
   * @returns {Comment[]}
   */
  getAll() {
    return this.items;
  }

  /**
   * Get a comment by index.
   *
   * @param {number} index Use a negative index to count from the end.
   * @returns {?Comment}
   */
  getByIndex(index) {
    if (index < 0) {
      index = this.items.length + index;
    }

    return this.items[index] || null;
  }

  /**
   * Get the number of comments.
   *
   * @returns {number}
   */
  getCount() {
    return this.items.length;
  }

  /**
   * Get comments by a condition.
   *
   * @param {(comment: Comment) => boolean} condition
   * @returns {Comment[]}
   */
  query(condition) {
    return this.items.filter(condition);
  }

  /**
   * Reset the comment list.
   */
  reset() {
    this.items = [];
  }

  /**
   * Set the {@link Comment#isNew} and {@link Comment#isSeen} properties to comments.
   *
   * @param {string[]} currentPageData Visits data for the current page.
   * @param {number} currentTime Unix timestamp.
   * @param {boolean} markAsReadRequested Whether to mark all previously shown comments on the page
   *   as read.
   * @returns {boolean} Whether there is a time conflict.
   */
  initNewAndSeen(currentPageData, currentTime, markAsReadRequested) {
    let timeConflict = false;
    const unseenComments = bootManager.getBootProcess().passedData.unseenComments;
    this.items.forEach((comment) => {
      // eslint-disable-next-line no-one-time-vars/no-one-time-vars
      const commentTimeConflict = comment.initNewAndSeen(
        currentPageData,
        currentTime,
        markAsReadRequested ? undefined : unseenComments?.find((c) => c.id === comment.id)
      );

      timeConflict ||= commentTimeConflict;
    });

    this.configureAndAddLayers((comment) => Boolean(comment.isNew));

    return timeConflict;
  }

  /**
   * Configure and add layers for a group of comments.
   *
   * @param {(comment: Comment) => boolean} condition
   */
  configureAndAddLayers(condition) {
    const comments = this.items.filter(condition);

    const floatingRects = comments.length
      ? talkPageController.getFloatingElements().map(getExtendedRect)
      : undefined;
    comments.forEach((comment) => {
      comment.configureLayers({
        add: false,
        update: false,
        floatingRects,
      });
    });

    // Faster to add them in one sequence.
    comments.forEach((comment) => {
      comment.addLayers();
    });
  }

  /**
   * Recalculate the offset of the highlighted comments' (usually, new or own) layers and redraw if
   * they've changed.
   *
   * @param {boolean} [redrawAll] Whether to redraw all layers and not stop at first three unmoved.
   */
  maybeRedrawLayers(redrawAll = false) {
    if (bootManager.isBooting() || (document.hidden && !redrawAll)) return;

    this.layersContainers.forEach((container) => {
      container.cdCouldHaveMoved = true;
    });

    let floatingRects;
    /** @type {Comment[]} */
    const comments = [];
    const rootBottom = bootManager.$root[0].getBoundingClientRect().bottom + window.scrollY;
    let notMovedCount = 0;

    // We go from the end and stop at the first _three_ comments that have not been misplaced. A
    // quirky reason for this is that the mouse could be over some comment making its underlay to be
    // repositioned immediately and therefore not appearing as misplaced to this procedure. Three
    // comments threshold should be more reliable.
    this.items.slice().reverse().some((comment) => {
      const shouldBeHighlighted =
        !comment.isCollapsed &&
        (
          comment.isNew ||
          comment.isOwn ||
          comment.isTarget ||
          comment.isHovered ||
          comment.isDeleted ||

          // Need to generate a gray line to close the gaps between adjacent list item elements.
          comment.isLineGapped
        );

      if (
        comment.underlay &&
        !shouldBeHighlighted &&

        // Layers that ended up under the bottom of the page content and could be moving the page
        // bottom down.
        comment.offset &&
        comment.offset.bottom > rootBottom
      ) {
        comment.removeLayers();
      } else if (shouldBeHighlighted) {
        floatingRects ||= talkPageController.getFloatingElements().map(getExtendedRect);
        const isMoved = comment.configureLayers({
          // If a comment was hidden, then became visible, we need to add the layers.
          add: true,

          update: false,
          floatingRects,
        });
        if (isMoved || redrawAll) {
          notMovedCount = 0;
          comments.push(comment);
        } else if (isMoved === undefined) {
          comment.removeLayers();

          // Nested containers shouldn't count, the offset of layers inside them may be OK, unlike the
          // layers preceding them.
        } else if (comment.getLayersContainer().cdIsTopLayersContainer) {
          // isMoved === false
          notMovedCount++;
          if (notMovedCount === 2) {
            return true;
          }
        }
      }

      return false;
    });

    // It's faster to update the offsets separately in one sequence.
    comments.forEach((comment) => {
      comment.updateLayersOffset();
    });
  }

  /**
   * _For internal use._ Empty the underlay registry and the layers container elements. Done on page
   * reload.
   */
  resetLayers() {
    this.underlays = [];
    this.layersContainers.forEach((container) => {
      container.innerHTML = '';
    });
  }

  /**
   * _For internal use._ Mark comments that are currently in the viewport as read, and also
   * {@link Comment#flash flash} comments that are prescribed to flash.
   */
  registerSeen() {
    if (document.hidden) return;

    const commentInViewport = this.findInViewport();
    if (!commentInViewport) return;

    const registerIfInViewport = (/** @type {Comment} */ comment) => {
      const isInViewport = comment.isInViewport();
      if (isInViewport) {
        comment.registerSeen();

        return false;
      } else if (isInViewport === false) {
        // isInViewport could also be `null`.
        return true;
      }
    };

    // Back
    this.items
      .slice(0, commentInViewport.index)
      .reverse()
      .some(registerIfInViewport);

    // Forward
    this.items
      .slice(commentInViewport.index)
      .some(registerIfInViewport);

    this.emit('registerSeen');
  }

  /**
   * Find any one comment inside the viewport.
   *
   * @param {'forward' | 'backward'} [findClosestDirection] If there is no comment in the viewport,
   *   find the closest comment in the specified direction.
   * @returns {?Comment}
   */
  findInViewport(findClosestDirection) {
    // Reset the roughOffset property. It is used only within this method.
    this.items.forEach((comment) => {
      comment.roughOffset = undefined;
    });

    const viewportTop = window.scrollY + talkPageController.getBodyScrollPaddingTop();
    const viewportBottom = window.scrollY + window.innerHeight;

    // Visibility is checked in the sense that an element is visible on the page, not necessarily in
    // the viewport.
    const isCommentVisible = (/** @type {Comment} */ comment) => {
      comment.getOffset({ set: true });

      return Boolean(comment.roughOffset);
    };
    const findVisible = (
      /** @type {'forward' | 'backward'} */ direction,
      startIndex = 0,
      /** @type {number | undefined} */ endIndex = undefined
    ) => {
      let comments = reorderArray(this.items, startIndex, direction === 'backward');
      if (endIndex !== undefined) {
        comments = comments.filter((comment) =>
          direction === 'forward'
            ? comment.index >= startIndex && comment.index < endIndex
            : comment.index <= startIndex && comment.index > endIndex
        );
      }

      return comments.find(isCommentVisible) || null;
    };

    const firstVisibleComment = findVisible('forward');
    const lastVisibleComment = findVisible('backward', this.items.length - 1);
    if (!firstVisibleComment) {
      return null;
    }

    const searchArea = {
      top: firstVisibleComment,
      bottom: /** @type {Comment} */ (lastVisibleComment),
    };
    let comment = searchArea.top;
    let foundComment;

    const findClosest = (
      /** @type {'forward' | 'backward' | undefined} */ direction,
      /** @type {typeof searchArea} */ currentSearchArea,
      reverse = false
    ) =>
      direction
        ? findVisible(
            direction,
            currentSearchArea[(direction === 'forward' ? reverse : !reverse) ? 'top' : 'bottom']
              .index
          )
        : null;

    // Here, we don't iterate over this.items as it may look like. We perform a so-called
    // interpolation search: narrow the search region by getting a proportion of the distance
    // between far away comments and the viewport and calculating the ID of the next comment based
    // on it; then, the position of that next comment is checked, and so on. this.items.length value
    // is used as an upper boundary for the number of cycle steps. It's more of a protection against
    // an infinite loop: the value is with a large margin and not practically reachable, unless when
    // there is only few comments. Usually the cycle finishes after a few steps.
    for (const _item of this.items) {
      if (!comment.roughOffset) {
        comment.getOffset({ set: true });
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!comment.roughOffset) {
          const commentCandidate = (
            findVisible('forward', comment.index, searchArea.bottom.index) ||
            findVisible('backward', comment.index, searchArea.top.index)
          );
          if (commentCandidate) {
            comment = commentCandidate;
          } else {
            foundComment = findClosest(findClosestDirection, searchArea);
            break;
          }
        }
      }

      if (comment.isInViewport(false)) {
        foundComment = comment;
        break;
      }

      if (
        comment.roughOffset &&

        (
          // The bottom edge of the viewport is above the first comment.
          (
            comment === firstVisibleComment &&
            viewportBottom < comment.roughOffset.bottomForVisibility
          ) ||

          // The top edge of the viewport is below the last comment.
          (comment === lastVisibleComment && viewportTop > comment.roughOffset.top)
        )
      ) {
        foundComment = findClosest(findClosestDirection, searchArea, true);
        break;
      }

      // Should usually be the case only if there is one comment on the page. But the proportion
      // below fails in rare cases too (see the console.warn call).
      if (searchArea.top === searchArea.bottom) {
        foundComment = findClosest(findClosestDirection, searchArea);
        break;
      }

      if (comment === firstVisibleComment) {
        comment = searchArea.bottom;
      } else {
        searchArea[
          viewportTop > /** @type {import('./Comment').CommentOffset} */ (comment.roughOffset).top
            ? 'top'
            : 'bottom'
        ] = comment;

        // There's not a single comment in the viewport.
        if (searchArea.bottom.index - searchArea.top.index <= 1) {
          foundComment = findClosest(findClosestDirection, searchArea);
          break;
        }

        // Determine the ID of the next comment to check.
        const higherTop = /** @type {import('./Comment').CommentOffset} */ (
          searchArea.top.roughOffset
        ).top;
        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const lowerBottom = /** @type {import('./Comment').CommentOffset} */ (
          searchArea.bottom.roughOffset
        ).bottomForVisibility;
        const proportion = (
          (viewportTop - higherTop) /
          ((lowerBottom - viewportBottom) + (viewportTop - higherTop))
        );
        if (proportion < 0 || proportion >= 1) {
          console.warn(
            'The proportion shouldn\'t be less than 0 or greater or equal to 1.',
            'proportion', proportion,
            'searchArea', searchArea
          );
        }
        comment = this.items[
          Math.round(
            (searchArea.bottom.index - searchArea.top.index - 1) * proportion +
            searchArea.top.index +
            0.5
          )
        ];
      }
    }

    return foundComment || null;
  }

  /**
   * Handles the `mousemove` and `mouseover` events and highlights hovered comments even when the
   * cursor is between comment parts, not over them. (An event handler for comment part elements
   * wouldn't be able to handle this space between.)
   *
   * @param {MouseEvent | JQuery.MouseMoveEvent | JQuery.MouseOverEvent} event
   */
  maybeHighlightHovered(event) {
    if (this.reformatCommentsSetting) return;

    const isObstructingElementHovered = talkPageController.isObstructingElementHovered();
    this.items
      .filter((comment) => comment.underlay)
      .forEach((comment) => {
        comment.updateHoverState(event, isObstructingElementHovered);
      });
  }

  /**
   * Get a comment by ID in the CD format.
   *
   * @param {string | undefined} id
   * @param {boolean} [impreciseDate] Comment date is inferred from the edit date (but these
   *   may be different). If `true`, we allow the time on the page to be 1-3 minutes less than the
   *   edit time.
   * @returns {?Comment}
   */
  getById(id, impreciseDate = false) {
    if (!this.items.length || !id) {
      return null;
    }

    const findById = (/** @type {string | undefined} */ idOrUndefined) =>
      this.items.find((comment) => comment.id === idOrUndefined);

    let comment = findById(id);
    if (!comment && impreciseDate) {
      const { date, author } = Comment.parseId(id) || {};
      if (date) {
        for (let gap = 1; !comment && gap <= 3; gap++) {
          comment = findById(
            Comment.generateId(new Date(date.getTime() - cd.g.msInMin * gap), author)
          );
        }
      }
    }

    return comment || null;
  }

  /**
   * @typedef {Expand<
   *   ReturnType<typeof Comment.parseDtId> & { comment: Comment | undefined }
   * >} DtIdComponents
   */

  /**
   * Get a comment by a comment ID in the DiscussionTools format.
   *
   * @template {boolean} [ReturnComponents=false]
   * @param {string} id
   * @param {ReturnComponents} [returnComponents] Whether to return the constituents of the ID (as
   *   an object) together with a comment.
   * @returns {(ReturnComponents extends true ? DtIdComponents : Comment) | null}
   */
  getByDtId(id, returnComponents) {
    const data = Comment.parseDtId(id);
    if (!data) {
      return null;
    }

    let comments = this.items.filter((comment) => (
      comment.date &&
      comment.date.getTime() === data.date.getTime() &&
      comment.author.getName() === data.author
    ));

    let comment;
    if (comments.length === 1) {
      comment = comments[0];
    } else if (comments.length > 1) {
      comments = comments.filter((c) => (
        c.getParent()?.date?.getTime() === data.parentDate?.getTime() &&
        c.getParent()?.author.getName() === data.parentAuthor &&
        (!data.sectionIdBeginning || c.section?.id.startsWith(data.sectionIdBeginning))
      ));
      comment = comments.length === 1 ? comments[0] : comments[data.index || 0];
    }

    /**
     * @typedef {ReturnComponents extends true ? DtIdComponents : Comment} DtIdComponentsOrComment
     */

    if (returnComponents) {
      data.comment = comment;

      return /** @type {DtIdComponentsOrComment} */ (data);
    }

    return /** @type {DtIdComponentsOrComment} */ (comment) || null;
  }

  /**
   * Get a comment by a comment ID in the CD or DiscussionTools format.
   *
   * @param {string} id
   * @param {boolean} [impreciseDate] (For CD IDs.) Comment date is inferred from the edit
   *   date (but these may be different). If `true`, we allow the time on the page to be 1-3 minutes
   *   less than the edit time.
   * @returns {Comment | null}
   */
  getByAnyId(id, impreciseDate = false) {
    return Comment.isId(id) ? this.getById(id, impreciseDate) : this.getByDtId(id);
  }

  /**
   * _For internal use._ Filter out floating and hidden elements from all the comments'
   * {@link Comment#highlightables highlightables}, change their attributes, and update the
   * comments' level and parent elements' level classes.
   */
  reviewHighlightables() {
    this.items.forEach((comment) => {
      comment.reviewHighlightables();
      comment.isLineGapped = comment.highlightables.length > 1 && comment.level > 0;
    });
  }

  /**
   * _For internal use._ Add new comments notifications to threads and sections.
   *
   * @param {import('./updateChecker').CommentWorkerNew[]} newComments
   */
  addNewCommentsNotes(newComments) {
    talkPageController.saveRelativeScrollPosition();

    this.items.forEach((comment) => {
      comment.subitemList.remove('newCommentsNote');
    });

    // Section-level replies notes.
    $('.cd-thread-newCommentsNote').remove();

    const newCommentIndexes = newComments.map((comment) => comment.index);
    Comment.groupByParent(newComments).forEach((comments, parent) => {
      if (parent instanceof Comment) {
        this.addNewCommentsNote(parent, comments, 'thread', newCommentIndexes);
      } else {
        // Add notes for level 0 comments and their children and the rest of the comments (for
        // example, level 1 comments without a parent and their children) separately.
        const sectionComments = comments
          .filter((comment) => comment.logicalLevel === 0)
          .reduce((arr, child) =>
            this.searchForNewCommentsInSubtree(child, arr, newCommentIndexes),
          /** @type {import('./updateChecker').CommentWorkerNew[]} */ ([])
          );
        // eslint-disable-next-line no-one-time-vars/no-one-time-vars
        const threadComments = comments.filter((comment) => !sectionComments.includes(comment));
        this.addNewCommentsNote(parent, sectionComments, 'section', newCommentIndexes);
        this.addNewCommentsNote(parent, threadComments, 'thread', newCommentIndexes);
      }
    });

    Thread.emit('toggle');

    talkPageController.restoreRelativeScrollPosition();
  }

  /**
   * Add an individual new comments notification to a thread or section.
   *
   * @param {Comment|import('./Section').default} parent
   * @param {import('./updateChecker').CommentWorkerNew[]} childComments
   * @param {'thread'|'section'} type
   * @param {number[]} newCommentIndexes
   * @private
   */
  addNewCommentsNote(parent, childComments, type, newCommentIndexes) {
    if (!childComments.length) return;

    const descendantComments = parent instanceof Comment
      ? childComments.reduce(
          (arr, child) => this.searchForNewCommentsInSubtree(child, arr, newCommentIndexes),
          /** @type {import('./updateChecker').CommentWorkerNew[]} */ ([])
        )
      : childComments;

    const authors = descendantComments
      .map((comment) => comment.author)
      .filter(unique);
    const button = new OO.ui.ButtonWidget({
      label: cd.s(
        type === 'thread' ? 'thread-newcomments' : 'section-newcomments',
        String(descendantComments.length),
        String(authors.length),
        authors.map((author) => author.getName()).join(cd.mws('comma-separator')),
        getCommonGender(authors)
      ),
      framed: false,
      flags: ['progressive'],
      classes: ['cd-button-ooui'],
    });
    button.on('click', () => {
      bootManager.reboot({
        commentIds: descendantComments.map((comment) => comment.id).filter(definedAndNotNull),
        pushState: true,
      });
    });

    /** @type {JQuery} */
    let $buttoned;
    /** @type {JQuery} */
    let $classed;
    if (parent instanceof Comment) {
      button.$element.addClass('cd-thread-button');
      const { $wrappingItem } = parent.addSubitem('newCommentsNote', 'bottom');
      $classed = $buttoned = $wrappingItem;

      // Update the collapsed range for the thread.
      if (parent.thread?.isCollapsed) {
        parent.thread.expand();
        parent.thread.collapse(true);
      }
    } else if (type === 'thread' && parent.$replyButtonWrapper) {
      button.$element.addClass('cd-thread-button');
      const tagName =
        /** @type {JQuery} */ (parent.$replyButtonContainer)[0].tagName === 'DL' ? 'dd' : 'li';
      $classed = $buttoned = $(`<${tagName}>`).insertBefore(parent.$replyButtonWrapper);
    } else {
      button.$element.addClass('cd-section-button');
      if (type === 'section') {
        $classed = $buttoned = $('<div>');
      } else {
        $buttoned = $('<dd>');
        $classed = $('<dl>').append($buttoned);
      }

      $classed.insertAfter(
        parent.$addSubsectionButtonsContainer && !parent.getChildren().length
          ? parent.$addSubsectionButtonsContainer
          : parent.$replyButtonContainer || parent.lastElementInFirstChunk
      );
    }
    $buttoned.append(button.$element);
    $classed.addClass('cd-thread-button-container cd-thread-newCommentsNote');
  }

  /**
   * _For internal use._ Reformat the comments (moving the author and date up and links down) if the
   * relevant setting is enabled.
   */
  async reformatComments() {
    if (!this.reformatCommentsSetting) return;

    $(document.body).addClass('cd-reformattedComments');
    if (!cd.page.exists()) return;

    /** @type {import('./Comment').ReplaceSignatureWithHeaderReturn} */
    const pagesToCheckExistence = [];
    this.items.forEach((comment) => {
      pagesToCheckExistence.push(...comment.replaceSignatureWithHeader());
      comment.addMenu();
    });

    // Check existence of user and user talk pages and apply respective changes to elements.
    /** @type {{ [x: string]: HTMLAnchorElement[] }} */
    const pageNamesToLinks = {};
    pagesToCheckExistence.forEach((page) => {
      if (!(page.pageName in pageNamesToLinks)) {
        pageNamesToLinks[page.pageName] = [];
      }
      pageNamesToLinks[page.pageName].push(page.link);
    });
    const pagesExistence = await getPagesExistence(Object.keys(pageNamesToLinks));
    Object.keys(pagesExistence).forEach((name) => {
      pageNamesToLinks[name].forEach((link) => {
        link.title = pagesExistence[name].normalized;
        if (pagesExistence[name].exists) {
          link.href = mw.util.getUrl(pagesExistence[name].normalized);
        } else {
          link.classList.add('new');
          link.href = mw.util.getUrl(name, {
            action: 'edit',
            redlink: 1,
          });
        }
      });
    });
  }

  /**
   * _For internal use._ Change the format of the comment timestamps according to the settings.
   */
  reformatTimestamps() {
    if (cd.g.areTimestampsDefault) return;

    this.items.forEach((comment) => {
      comment.reformatTimestamp();
    });
  }

  /**
   * Change the state of all comments to unselected.
   *
   * @private
   */
  resetSelectedComment() {
    const comment = this.items.find((c) => c.isSelected);
    if (comment) {
      comment.setSelected(false);
      this.emit('unselect', comment);
    }
  }

  /**
   * Determine which comment on the page is selected.
   *
   * @returns {?Comment}
   */
  getSelectedComment() {
    const selection = window.getSelection();
    let comment;
    if (selection.toString().trim()) {
      const { higherNode } =
        /** @type {import('./utils-window').HigherNodeAndOffsetInSelection} */ (
          getHigherNodeAndOffsetInSelection(selection)
        );
      const treeWalker = new TreeWalker(bootManager.rootElement, undefined, false, higherNode);
      let commentIndex;
      do {
        commentIndex =
          treeWalker.currentNode instanceof HTMLElement
            ? treeWalker.currentNode.dataset.cdCommentIndex
            : undefined;
      } while (commentIndex === undefined && treeWalker.parentNode());
      if (commentIndex === undefined) {
        this.resetSelectedComment();
      } else {
        comment = this.getByIndex(Number(commentIndex));
        if (comment) {
          if (!comment.isSelected) {
            this.resetSelectedComment();
            comment.setSelected(true);
            this.emit('select', comment);
          }
        } else {
          this.resetSelectedComment();
        }
      }
    } else {
      this.resetSelectedComment();
    }

    return comment || null;
  }

  /**
   * Find a previous comment by time by the specified author within a 1-day window.
   *
   * @param {Date} date
   * @param {string} author
   * @returns {Comment}
   */
  findPriorComment(date, author) {
    return this.items
      .filter((comment) => comment.hasDate())
      .filter((comment) => (
        comment.author.getName() === author &&
        comment.date < date &&
        comment.date.getTime() > date.getTime() - cd.g.msInDay
      ))
      .sort((c1, c2) => c1.date.getTime() - c2.date.getTime())
      .slice(-1)[0];
  }

  /**
   * _For internal use._ Add available DiscussionTools IDs to respective comments.
   *
   * @param {string[]} ids
   */
  setDtIds(ids) {
    ids.forEach((id) => {
      const comment = this.getByDtId(id);
      if (comment) {
        comment.dtId = id;
      }
    });
  }

  /**
   * _For internal use._ Set the {@link Comment#isTableComment} property for each "table comment",
   * i.e. a comment that is (or its signature is) inside a table containing only that comment.
   */
  findAndUpdateTableComments() {
    // Faster than doing it for every individual comment.
    bootManager.rootElement
      .querySelectorAll('table.cd-comment-part .cd-signature, .cd-comment-part > table .cd-signature')
      .forEach((signature) => {
        const index = /** @type {HTMLElement} */ (signature.closest('.cd-comment-part')).dataset
          .cdCommentIndex;
        if (index !== undefined) {
          this.items[Number(index)].isTableComment = true;
        }
      });
  }

  /**
   * Add comment's children, including indirect, into an array, if they are in the array of all new
   * comments.
   *
   * @param {import('./updateChecker').CommentWorkerNew} childComment
   * @param {import('./updateChecker').CommentWorkerNew[]} newCommentsInSubtree
   * @param {number[]} newCommentIndexes
   * @returns {import('./updateChecker').CommentWorkerNew[]}
   * @private
   */
  searchForNewCommentsInSubtree(childComment, newCommentsInSubtree, newCommentIndexes) {
    if (newCommentIndexes.includes(childComment.index)) {
      newCommentsInSubtree.push(childComment);
    }
    childComment.children.forEach((cc) => {
      this.searchForNewCommentsInSubtree(cc, newCommentsInSubtree, newCommentIndexes);
    });

    return newCommentsInSubtree;
  }

  /**
   * _For internal use._ Perform some DOM-related tasks after parsing comments.
   */
  adjustDom() {
    this.mergeAdjacentCommentLevels();
    this.mergeAdjacentCommentLevels();
    if (
      bootManager.rootElement.querySelector('.cd-commentLevel:not(ol) + .cd-commentLevel:not(ol)')
    ) {
      console.warn('.cd-commentLevel adjacencies have left.');
    }

    this.items.forEach((comment) => {
      comment.maybeSplitParent();
    });
  }

  /**
   * Remove DT's event listener from its comment links and attach ours.
   *
   * @private
   */
  handleDtTimestampsClick() {
    if (this.reformatCommentsSetting) return;

    this.items.forEach((comment) => {
      comment.handleDtTimestampClick();
    });
  }

  /**
   * Combine two adjacent `.cd-commentLevel` elements into one, recursively going deeper in terms of
   * nesting level.
   *
   * @private
   */
  mergeAdjacentCommentLevels() {
    /** @type {NodeListOf<HTMLElement>} */
    const levels = bootManager.rootElement.querySelectorAll(
      '.cd-commentLevel:not(ol) + .cd-commentLevel:not(ol)'
    );
    if (!levels.length) return;

    const isOrHasCommentLevel = (/** @type {HTMLElement} */ el) =>
      Boolean(
        (el.classList.contains('cd-commentLevel') && el.tagName !== 'OL') ||
        el.querySelector('.cd-commentLevel:not(ol)')
      );

    [...levels].forEach((bottomElement) => {
      const topElement = /** @type {HTMLElement | null} */ (bottomElement.previousElementSibling);

      // If the previous element was removed in this cycle
      if (!topElement) return;

      for (
        let /** @type {HTMLElement | undefined} */ currentTopElement = topElement,
          /** @type {HTMLElement | undefined} */ currentBottomElement = bottomElement,
          firstMoved;
        currentTopElement && currentBottomElement && isOrHasCommentLevel(currentBottomElement);
        currentBottomElement = firstMoved,
        currentTopElement =
          /** @type {HTMLElement | null} */ (firstMoved?.previousElementSibling) ||
          undefined,
        firstMoved = undefined
      ) {
        const topTag = currentTopElement.tagName;
        const bottomInnerTags = /** @type {Record<'DD' | 'LI', 'DD' | 'LI'>} */ ({});
        if (topTag === 'UL') {
          bottomInnerTags.DD = 'LI';
        } else if (topTag === 'DL') {
          bottomInnerTags.LI = 'DD';
        }

        if (
          isOrHasCommentLevel(currentTopElement) &&

          /*
            Avoid collapsing adjacent <li>s and <dd>s if we deal with a structure like this:

              <li>
                <div>Comment</div>
                <ul>Replies</ul>
              </li>
              <li>
                <div>Comment</div>
                <ul>Replies</ul>
              </li>
          */
          ['DL', 'DD', 'UL', 'LI'].includes(
            /** @type {HTMLElement} */ (currentBottomElement.firstElementChild).tagName
          )
        ) {
          while (currentBottomElement.childNodes.length) {
            let child = /** @type {ChildNode} */ (currentBottomElement.firstChild);
            if (child instanceof HTMLElement) {
              if (child.tagName in bottomInnerTags) {
                child = this.changeElementType(
                  child,
                  bottomInnerTags[/** @type {keyof typeof bottomInnerTags} */ (child.tagName)]
                );
              }
              firstMoved ??= /** @type {HTMLElement} */ (child);
            } else if (firstMoved === undefined && child.textContent.trim()) {
              // Don't fill the firstMoved variable which is used further to merge elements if
              // there is a non-empty text node between. (An example that is now fixed:
              // https://ru.wikipedia.org/wiki/Википедия:Форум/Архив/Викиданные/2018/1_полугодие#201805032155_NBS,
              // but other can be on the loose.) Instead, wrap the text node into an element to
              // prevent it from being ignored when searching next time for adjacent .commentLevel
              // elements. This could be seen only as an additional precaution, since it doesn't
              // fix the source of the problem: the fact that a bare text node is (probably) a
              // part of the reply. It shouldn't be happening.
              firstMoved = undefined;
              const newChild = document.createElement('span');
              newChild.append(child);
              child = newChild;
            }
            currentTopElement.append(child);
          }
          currentBottomElement.remove();
        }
      }
    });
  }

  /**
   * Replace an element with an identical one but with another tag name, i.e. move all child nodes,
   * attributes, and some bound events to a new node, and also reassign references in some variables
   * and properties to this element. Unfortunately, we can't just change the element's `tagName` to
   * do that.
   *
   * @param {HTMLElement} element
   * @param {string} newType
   * @returns {HTMLElement}
   */
  changeElementType(element, newType) {
    const newElement = document.createElement(newType);
    while (element.firstChild) {
      newElement.append(element.firstChild);
    }
    [...element.attributes].forEach((attribute) => {
      newElement.setAttribute(attribute.name, attribute.value);
    });

    // If this element is a part of a comment, replace it in the Comment object instance.
    const commentIndex = element.dataset.cdCommentIndex;
    if (commentIndex === undefined) {
      /** @type {HTMLElement} */ (element.parentElement).replaceChild(newElement, element);
    } else {
      this.items[Number(commentIndex)].replaceElement(element, newElement);
    }

    talkPageController.replaceScrollAnchorElement(element, newElement);

    return newElement;
  }

  /**
   * _For internal use._ Add the `'cd-connectToPreviousItem'` class to some item elements to
   * visually connect threads broken by some intervention.
   */
  connectBrokenThreads() {
    /** @type {Element[]} */
    const items = [];

    bootManager.rootElement
      .querySelectorAll('dd.cd-comment-part-last + dd, li.cd-comment-part-last + li')
      .forEach((el) => {
        if (el.firstElementChild?.classList.contains('cd-commentLevel')) {
          items.push(el);
        }
      });

    // When editing https://en.wikipedia.org/wiki/Wikipedia:Village_pump_(technical)/Archive_212#c-PrimeHunter-20240509091500-2605:A601:AAF7:3700:A1D7:26C1:E273:28CF-20240509055600
    bootManager.rootElement
      .querySelectorAll('dd.cd-comment-part:not(.cd-comment-part-last) + dd > .cd-comment-part:first-child, li.cd-comment-part:not(.cd-comment-part-last) + li > .cd-comment-part:first-child')
      .forEach((el) => {
        items.push(/** @type {HTMLElement} */ (el.parentElement));
      });

    // https://commons.wikimedia.org/wiki/User_talk:Jack_who_built_the_house/CD_test_cases#202009202110_Example
    bootManager.rootElement
      .querySelectorAll('.cd-comment-replacedPart.cd-comment-part-last')
      .forEach((el) => {
        const possibleItem = /** @type {HTMLElement} */ (el.parentElement).nextElementSibling;
        if (possibleItem?.firstElementChild?.classList.contains('cd-commentLevel')) {
          items.push(possibleItem);
        }
      });

    // https://commons.wikimedia.org/wiki/User_talk:Jack_who_built_the_house/CD_test_cases#Image_breaking_a_thread
    bootManager.rootElement
      .querySelectorAll('.cd-commentLevel + .thumb + .cd-commentLevel > li')
      .forEach((el) => {
        items.push(el);
      });

    if (talkPageController.areThereOutdents()) {
      // Outdent templates. We could instead merge adjacent <li>s, but if there is a {{outdent|0}}
      // template and the whole <li> of the parent is considered a comment part, then we can't do
      // that.
      bootManager.rootElement
        .querySelectorAll(`.cd-commentLevel > li + li > .${cd.config.outdentClass}, .cd-commentLevel > dd + dd > .${cd.config.outdentClass}`)
        .forEach((el) => {
          items.push(/** @type {HTMLElement} */ (el.parentElement));
        });
      bootManager.rootElement
        .querySelectorAll(`.cd-commentLevel > li + .cd-comment-outdented, .cd-commentLevel > dd + .cd-comment-outdented`)
        .forEach((el) => {
          items.push(el);
        });
    }

    items.forEach((item) => {
      item.classList.add('cd-connectToPreviousItem');
    });
  }

  /**
   * _For internal use._ Add "Toggle children threads" buttons to comments.
   */
  addToggleChildThreadsButtons() {
    this.items.forEach((comment) => {
      comment.addToggleChildThreadsButton();
    });
  }

  /**
   * Expand all threads of a certain level (and higher, i.e. shallower) on the page.
   *
   * @param {number} level
   */
  expandAllThreadsOfLevel(level) {
    this.items
      .slice()
      .reverse()
      .filter((comment) => comment.level <= level)
      .forEach((comment) => {
        comment.thread?.expand(undefined, true);
      });
    this.items.forEach((comment) => {
      comment.updateToggleChildThreadsButton();
    });
  }

  /**
   * Collapse all threads of a certain level on the page.
   *
   * @param {number} level
   */
  collapseAllThreadsOfLevel(level) {
    this.items
      .slice()
      .reverse()
      .filter((comment) => comment.level === level)
      .forEach((comment) => {
        comment.thread?.collapse(undefined, true);
      });
    this.items
      .forEach((comment) => {
        comment.updateToggleChildThreadsButton();
      });
  }

  /**
   * Generic function for {@link module:navPanel.goToPreviousNewComment} and
   * {@link module:navPanel.goToNextNewComment}.
   *
   * @param {'forward' | 'backward' | undefined} direction
   * @private
   */
  goToNewCommentInDirection(direction) {
    if (talkPageController.isAutoScrolling()) return;

    const commentInViewport = this.findInViewport(direction);
    if (!commentInViewport) return;

    const candidates = reorderArray(
      this.getAll(),
      commentInViewport.index,
      direction === 'backward'
    ).filter((comment) => comment.isNew && !comment.isInViewport());
    const comment = candidates.find((c) => c.isInViewport() === false) || candidates.at(0);
    if (comment) {
      comment.scrollTo({
        flash: false,
        callback: () => {
          // The default controller.handleScroll() callback is executed in $#cdScrollTo, but
          // that happens after a 300ms timeout, so we have a chance to have our callback executed
          // first.
          comment.registerSeen(direction, true);
        },
      });
    }
  }

  /**
   * Scroll to the previous new comment.
   */
  goToPreviousNewComment() {
    this.goToNewCommentInDirection('backward');
  }

  /**
   * Scroll to the next new comment.
   */
  goToNextNewComment() {
    this.goToNewCommentInDirection('forward');
  }

  /**
   * Scroll to the first unseen comment.
   */
  goToFirstUnseenComment() {
    if (talkPageController.isAutoScrolling()) return;

    const candidates = this.query((c) => c.isSeen === false);
    const comment = candidates.find((c) => c.isInViewport() === false) || candidates[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    comment?.scrollTo({
      flash: false,
      callback: () => {
        // The default controller.handleScroll() callback is executed in $#cdScrollTo, but
        // that happens after a 300ms timeout, so we have a chance to have our callback executed
        // first.
        comment.registerSeen('forward', true);
      },
    });
  }

  /**
   * Get the storage for the "Thanks" feature.
   *
   * @returns {StorageItemWithKeys<ThanksData>}
   */
  getThanksStorage() {
    return this.thanksStorage;
  }
}

export default new CommentManager();
