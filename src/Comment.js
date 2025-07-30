/* eslint-disable no-self-assign */
import CommentButton from './CommentButton';
import CommentSource from './CommentSource';
import CommentSubitemList from './CommentSubitemList';
import LiveTimestamp from './LiveTimestamp';
import bootController from './bootController';
import settings from './settings';
import CdError from './shared/CdError';
import CommentSkeleton from './shared/CommentSkeleton';
import ElementsTreeWalker from './shared/ElementsTreeWalker';
import cd from './shared/cd';
import { isInline, unique } from './shared/utils-general';
import talkPageController from './talkPageController';
import userRegistry from './userRegistry';

/**
 * @typedef {object} CommentOffset
 * @property {number} top
 * @property {number} bottom
 * @property {number} left
 * @property {number} right
 * @property {number} bottomForVisibility A solution for comments that have the height bigger than
 *   the viewport height. In Chrome, the scrolling step is 100 pixels.
 * @property {number} firstHighlightableWidth First highlightable's width to determine if the
 *   element is moved in future checks.
 * @memberof Comment
 * @inner
 */

/**
 * @typedef {object} CommentMargins
 * @property {number} left Left margin.
 * @property {number} right Right margin.
 * @memberof Comment
 * @inner
 */

/**
 * @typedef {object} ScrollToConfig
 * @property {boolean} [smooth=true] Use a smooth animation.
 * @property {boolean} [expandThreads=false] Whether to expand the threads down to the
 *   comment (to avoid the notification "The comment is in a collapsed thread").
 * @property {boolean} [flash] Whether to flash the comment as target.
 * @property {boolean} [pushState=false] Whether to push a state to the history with the
 *   comment ID as a fragment.
 * @property {() => void} [callback] Callback to run after the animation has completed.
 * @property {'top'|'center'|'bottom'} [alignment] Where should the element be positioned
 *   relative to the viewport.
 */

/**
 * @typedef {object[]} ReplaceSignatureWithHeaderReturn
 * @property {string} pageName
 * @property {HTMLAnchorElement} link
 */

/**
 * @typedef {RemoveMethods<import('./shared/SectionSkeleton').default>} SectionBase
 */

/**
 * @typedef {Omit<RemoveMethods<import('./shared/CommentSkeleton').default>, 'children' | 'previousComments'>} CommentBase
 */

/**
 * @typedef {Map<import('./updateChecker').SectionWorkerMatched | import('./Section').default | null, import('./updateChecker').CommentWorkerMatched[] | Comment[]>} CommentsBySection
 */

/**
 * @typedef {Map<Comment | import('./Section').default, import('./updateChecker').CommentWorkerMatched[]>} RenderedCommentsByParent
 */

/**
 * A comment (any signed, and in some cases unsigned, text on a wiki talk page).
 *
 * @template {AnyNode} N
 * @template {boolean} [Reformatted=boolean]
 * @augments CommentSkeleton<N>
 */
class Comment extends CommentSkeleton {
  /** @readonly */
  TYPE = 'comment';

  /**
   * @override
   * @type {ElementFor<N>}
   */
  signatureElement = this.signatureElement;

  /**
   * @override
   * @type {ElementFor<N>}
   */
  timestampElement = this.timestampElement;

  /**
   * @override
   * @type {ElementFor<N>}
   */
  authorLink = this.authorLink;

  /**
   * @override
   * @type {ElementFor<N>}
   */
  authorTalkLink = this.authorTalkLink;

  /**
   * @override
   * @type {ElementFor<N>[]}
   */
  elements = this.elements;

  /**
   * @override
   * @type {import('./shared/Parser').SignatureTarget<ElementFor<N>>[]}
   */
  extraSignatures = this.extraSignatures;

  /** @type {Reformatted} */
  reformatted;

  /** @type {Direction} */
  direction;

  /**
   * A special {@link Comment#highlightables highlightable} used to
   * {@link Comment#getLayersMargins determine layers margins}.
   *
   * @type {ElementFor<N>}
   * @private
   */
  marginHighlightable;

  /**
   * @typedef {this extends Comment<N, true> ? ElementFor<N> : undefined} ElementIfReformatted
   */

  /**
   * @type {ElementIfReformatted}
   */
  headerElement;

  /**
   * @type {ElementIfReformatted}
   */
  menuElement;

  /**
   * @typedef {this extends Comment<N, true> ? JQuery<ElementIfReformatted> : undefined} JQueryIfReformatted
   */

  /**
   * Comment header. Used when comment reformatting is enabled.
   *
   * @type {JQueryIfReformatted}
   */
  $header;

  /**
   * Comment menu. Used when comment reformatting is enabled; otherwise
   * {@link Comment#$overlayMenu} is used.
   *
   * @type {JQueryIfReformatted}
   */
  $menu;

  /**
   * _For internal use._ Comment's underlay as a native (non-jQuery) element.
   *
   * @type {?ElementFor<N>}
   */
  underlay;

  /**
   * Comment's overlay.
   *
   * @type {?ElementFor<N>}
   * @private
   */
  overlay;

  /**
   * Line element in comment's overlay.
   *
   * @type {ElementFor<N>}
   * @private
   */
  line;

  /**
   * Comment's side marker.
   *
   * @type {ElementFor<N>}
   * @private
   */
  marker;

  /**
   * Inner wrapper in comment's overlay.
   *
   * @type {ElementFor<N>}
   * @private
   */
  overlayInnerWrapper;

  /**
   * Gradient element in comment's overlay.
   *
   * @type {ElementFor<N>}
   * @private
   */
  overlayGradient;

  /**
   * Menu element in comment's overlay.
   *
   * @type {ElementFor<N>}
   * @private
   */
  overlayMenu;

  /**
   * Comment's underlay.
   *
   * @type {?JQuery}
   */
  $underlay;

  /**
   * Comment's overlay.
   *
   * @type {?JQuery}
   */
  $overlay;

  /**
   * Comment's side marker.
   *
   * @type {JQuery}
   */
  $marker;

  /**
   * Menu element in the comment's overlay.
   *
   * @type {JQuery}
   */
  $overlayMenu;

  /**
   * Gradient element in the comment's overlay.
   *
   * @type {JQuery}
   */
  $overlayGradient;

  /**
   * Is the comment new. Is set to boolean only on active pages (not archived, not old diffs)
   * excluding pages that are visited for the first time.
   *
   * @type {?boolean}
   */
  isNew = null;

  /**
   * Has the comment been seen if it is new. Is set only on active pages (not archived, not old
   * diffs) excluding pages that are visited for the first time. Check using `=== false` if you
   * need to know if the comment is highlighted as new and unseen.
   *
   * @type {?boolean}
   */
  isSeen = null;

  /**
   * Is the comment currently highlighted as a target comment.
   *
   * @type {boolean}
   */
  isTarget = false;

  /**
   * Is the comment currently hovered.
   *
   * @type {boolean}
   */
  isHovered = false;

  /**
   * Has the comment changed since the previous visit.
   *
   * @type {?boolean}
   */
  isChangedSincePreviousVisit = null;

  /**
   * Has the comment changed while the page was idle. (The new version may be rendered and may be
   * not, if the layout is too complex.)
   *
   * @type {?boolean}
   */
  isChanged = null;

  /**
   * Was the comment deleted while the page was idle.
   *
   * @type {?boolean}
   */
  isDeleted = null;

  /**
   * Should the comment be flashed as changed when it appears in sight.
   *
   * @type {?boolean}
   */
  willFlashChangedOnSight = false;

  /**
   * Is the comment (or its signature) inside a table containing only one comment.
   *
   * @type {boolean}
   */
  isTableComment = false;

  /**
   * Is the comment a part of a collapsed thread.
   *
   * @type {boolean}
   */
  isCollapsed = false;

  /**
   * If the comment is collapsed, that's the closest collapsed thread that this comment is related
   * to.
   *
   * @type {?import('./Thread').default}
   */
  collapsedThread = null;

  /**
   * List of the comment's {@link CommentSubitemList subitems}.
   *
   * @type {CommentSubitemList}
   */
  subitemList = new CommentSubitemList();

  wasMenuHidden = false;

  /** @type {Array<() => void>} */
  genderRequestCallbacks = [];

  /**
   * Is there a "gap" in the comment between {@link Comment#highlightable highlightables} that needs
   * to be closed visually so that the comment looks like one comment and not several.
   *
   * @type {boolean}
   */
  isLineGapped;

  /**
   * Has the comment been seen before it was changed.
   *
   * @type {?boolean}
   * @private
   */
  isSeenBeforeChanged = null;

  /** @type {import('./Thread').default} */
  thread;

  /** @type {string|undefined} */
  dtId;

  /**
   * The comment's coordinates.
   *
   * @type {?CommentOffset}
   */
  offset;

  /**
   * The comment's rough coordinates (without taking into account floating elements around the
   * comment).
   *
   * @type {?CommentOffset}
   */
  roughOffset;

  /**
   * @override
   * @type {?import('./Section').default<N>}
   */
  section = this.section;

  /**
   * Comment's source code object.
   *
   * @type {?CommentSource|undefined}
   */
  source;

  /**
   * Create a comment object.
   *
   * @param {import('./shared/Parser').default<N>} parser
   * @param {import('./shared/Parser').SignatureTarget} signature Signature object returned by
   *   {@link Parser#findSignatures}.
   * @param {import('./shared/Parser').Target[]} targets Sorted target objects returned by
   *   {@link Parser#findSignatures} + {@link Parser#findHeadings}.
   */
  constructor(parser, signature, targets) {
    super(parser, signature, targets);

    /**
     * @see CommentSkeleton#highlightables
     */
    this.highlightables = /** @type {ElementFor<N>[]} */ (this.highlightables);

    this.reformatted = /** @type {Reformatted} */ (settings.get('reformatComments') || false);
    this.showContribsLink = settings.get('showContribsLink');
    this.hideTimezone = settings.get('hideTimezone');
    this.timestampFormat = settings.get('timestampFormat');
    this.useUiTime = settings.get('useUiTime');
    this.countEditsAsNewComments = settings.get('countEditsAsNewComments');

    /**
     * Comment author user object.
     *
     * @type {import('./User').default}
     */
    this.author = userRegistry.get(this.authorName);

    /**
     * Comment signature element.
     *
     * @type {JQuery}
     */
    this.$signature = $(this.signatureElement);

    /**
     * Is the comment actionable, i.e. you can reply to or edit it. A comment is actionable if it is
     * not in a closed discussion or an old diff page. (Previously the presence of an author was
     * also checked, but currently all comments should have an author.)
     *
     * @type {boolean}
     */
    this.isActionable = Boolean(
      cd.page.isActive() &&
        !talkPageController.getClosedDiscussions().some((el) => el.contains(this.elements[0]))
    );

    this.isEditable = this.isActionable && (this.isOwn || settings.get('allowEditOthersComments'));

    // @ts-ignore
    this.highlightables.forEach(this.bindEvents.bind(this));

    this.updateMarginHighlightable();

    /**
     * Get the type of the list that `el` is an item of. This function traverses the ancestors of `el`
     * and returns the tag name of the first ancestor that has the class `cd-commentLevel`.
     *
     * @param {ElementFor<N>} el
     * @returns {?ListType}
     * @private
     */
    const getContainerListType = (el) => {
      const treeWalker = new ElementsTreeWalker(bootController.rootElement, el);
      while (treeWalker.parentNode()) {
        if (treeWalker.currentNode.classList.contains('cd-commentLevel')) {
          return /** @type {ListType} */ (treeWalker.currentNode.tagName.toLowerCase());
        }
      }

      return null;
    };

    if (this.level !== 0) {
      /**
       * Name of the tag of the list that this comment is an item of. `'dl'`, `'ul'`, `'ol'`, or
       * `null`.
       *
       * @type {?ListType}
       */
      // @ts-ignore
      this.containerListType = getContainerListType(this.highlightables[0]);

      this.mhContainerListType = getContainerListType(this.marginHighlightable);
    }
  }

  /**
   * Check if the comment is reformatted.
   *
   * @returns {this is Comment<N, true>}
   */
  isReformatted() {
    return this.reformatted;
  }

  /**
   * Set the {@link Comment#marginHighlightable} element.
   *
   * @private
   */
  updateMarginHighlightable() {
    if (this.highlightables.length > 1) {
      const nestingLevels = /** @type {number[]} */ ([]);
      const closestListTypes = /** @type {ListType[]} */ ([]);
      const firstAndLastHighlightable = [
        this.highlightables[0],
        this.highlightables[this.highlightables.length - 1],
      ];
      firstAndLastHighlightable.forEach((highlightable, i) => {
        const treeWalker = new ElementsTreeWalker(bootController.rootElement, highlightable);
        nestingLevels[i] = 0;
        while (treeWalker.parentNode()) {
          nestingLevels[i]++;
          if (!closestListTypes[i] && ['DL', 'UL', 'OL'].includes(treeWalker.currentNode.tagName)) {
            closestListTypes[i] = /** @type {ListType} */ (
              treeWalker.currentNode.tagName.toLowerCase()
            );
          }
        }
      });
      let marginHighlightableIndex;
      for (let i = 0; i < 2; i++) {
        if (
          marginHighlightableIndex === undefined
            ? nestingLevels[i] === Math.min(...nestingLevels)
            : closestListTypes[marginHighlightableIndex] === 'ol' && closestListTypes[i] !== 'ol'
        ) {
          marginHighlightableIndex = i;
        }
      }

      this.marginHighlightable =
        firstAndLastHighlightable[/** @type {number} */ (marginHighlightableIndex)];
    } else {
      this.marginHighlightable = this.highlightables[0];
    }
  }

  /**
   * Process a possible signature node or a node that contains text which is part of a signature.
   *
   * @param {?N} node
   * @param {boolean} [isSpaced=false] Was the previously removed node start with a space.
   * @private
   */
  processPossibleSignatureNode(node, isSpaced = false) {
    if (!node) return;

    // Remove text at the end of the element that looks like a part of the signature.
    if (node instanceof Text || (node instanceof Element && !node.children.length)) {
      node.textContent = node.textContent
        .replace(cd.config.signaturePrefixRegexp, '')
        .replace(cd.config.signaturePrefixRegexp, '');
    }

    // Remove the entire element.
    if (
      node instanceof Element &&
      node.textContent.length < 30 &&
      ((!isSpaced &&
        (node.getAttribute('style') || ['SUP', 'SUB'].includes(node.tagName)) &&
        // Templates like "citation needed" or https://ru.wikipedia.org/wiki/Template:-:
        !node.classList.length) ||
        // Cases like https://ru.wikipedia.org/?diff=119667594
        (// https://ru.wikipedia.org/wiki/Обсуждение_участника:Adamant.pwn/Архив/2023#c-Adamant.pwn-20230722131600-Rampion-20230722130800
        (node.getAttribute('style') ||
          // https://en.wikipedia.org/?oldid=1220458782#c-Dxneo-20240423211700-Dilettante-20240423210300
          ['B', 'STRONG'].includes(node.tagName)) &&
          node.textContent.toLowerCase() === this.author.getName().toLowerCase()))
    ) {
      node.remove();
    }
  }

  /**
   * Clean up the signature and elements in front of it.
   *
   * @private
   */
  cleanUpSignature() {
    let previousNode = this.signatureElement.previousSibling;

    // Cases like https://ru.wikipedia.org/?diff=117350706
    if (!previousNode) {
      const parentElement = this.signatureElement.parentElement;
      const parentPreviousNode = parentElement?.previousSibling;
      if (parentPreviousNode && isInline(parentPreviousNode, true)) {
        const parentPreviousElementNode = parentElement?.previousElementSibling;

        // Make sure we don't erase some blockquote with little content.
        if (!parentPreviousElementNode || isInline(parentPreviousElementNode)) {
          previousNode = parentPreviousNode;
        }
      }
    }

    const previousPreviousNode = previousNode?.previousSibling;

    // Use this to tell the cases where a styled element should be kept
    // https://commons.wikimedia.org/?diff=850489596 from cases where it should be removed
    // https://en.wikipedia.org/?diff=1229675944
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const isPpnSpaced = previousNode?.textContent.startsWith(' ');

    this.processPossibleSignatureNode(previousNode);
    if (
      previousNode &&
      previousPreviousNode &&
      (!previousNode.parentNode || !previousNode.textContent.trim())
    ) {
      // eslint-disable-next-line no-one-time-vars/no-one-time-vars
      const previousPreviousPreviousNode = previousPreviousNode.previousSibling;
      // eslint-disable-next-line no-one-time-vars/no-one-time-vars
      const isPppnSpaced = previousPreviousNode?.textContent.startsWith(' ');
      this.processPossibleSignatureNode(previousPreviousNode, isPpnSpaced);

      // Rare cases like https://en.wikipedia.org/?diff=1022471527
      if (!previousPreviousNode.parentNode) {
        this.processPossibleSignatureNode(previousPreviousPreviousNode, isPppnSpaced);
      }
    }
  }

  /**
   * Do nearly the same thing as {@link Comment#reviewHighlightables} for the second time: if
   * {@link Comment#reviewHighlightables} has altered the highlightables, this will save the day.
   *
   * @private
   */
  // @ts-ignore
  rewrapHighlightables() {
    [this.highlightables[0], this.highlightables[this.highlightables.length - 1]]
      .filter(unique)
      .filter(
        (el) =>
          cd.g.badHighlightableElements.includes(el.tagName) ||
          (this.highlightables.length > 1 &&
            el.tagName === 'LI' &&
            el.parentElement?.tagName === 'OL') ||
          Array.from(el.classList).some((name) => !name.startsWith('cd-'))
      )
      .forEach((el) => {
        const wrapper = document.createElement('div');
        const origEl = el;
        this.replaceElement(el, wrapper);
        wrapper.appendChild(origEl);

        this.addAttributes();
        origEl.classList.remove('cd-comment-part', 'cd-comment-part-first', 'cd-comment-part-last');
        delete origEl.dataset.cdCommentIndex;
      });
  }

  /**
   * _For internal use._ Add a comment header to the top highlightable element. Remove the comment
   * signature unless there is more than one of them.
   *
   * @returns {ReplaceSignatureWithHeaderReturn} Pages to check existence of.
   * @throws {CdError}
   */
  replaceSignatureWithHeader() {
    if (!this.isReformatted()) {
      throw new CdError();
    }

    const pagesToCheckExistence = [];

    const headerWrapper = Comment.prototypes.get('headerWrapperElement');
    this.headerElement = /** @type {ElementIfReformatted} */ (headerWrapper.firstChild);
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const authorWrapper = /** @type {HTMLElement} */ (this.headerElement.firstChild);
    const authorLink = /** @type {HTMLAnchorElement} */ (authorWrapper.firstChild);
    const authorLinksWrapper = /** @type {HTMLElement} */ (authorLink.nextElementSibling);
    const bdiElement = /** @type {HTMLElement} */ (authorLink.firstChild);
    const authorTalkLink = /** @type {HTMLAnchorElement} */ (authorLinksWrapper.firstElementChild);
    let contribsLink;
    if (this.showContribsLink) {
      contribsLink = /** @type {HTMLAnchorElement} */ (authorLinksWrapper.lastElementChild);
      if (!this.author.isRegistered()) {
        /** @type {HTMLElement} */ (contribsLink.previousSibling).remove();
        contribsLink.remove();
      }
    }

    if (this.authorLink) {
      // Move the existing author link to the header.

      if (this.extraSignatures.length) {
        this.authorLink = /** @type {HTMLAnchorElement} */ (this.authorLink.cloneNode(true));
      }

      // eslint-disable-next-line no-one-time-vars/no-one-time-vars
      const beforeAuthorLinkParseReturn = cd.config.beforeAuthorLinkParse?.(
        this.authorLink,
        authorLink
      );
      authorLink.replaceWith(this.authorLink);
      this.authorLink.classList.add('cd-comment-author');
      this.authorLink.innerHTML = '';
      this.authorLink.appendChild(bdiElement);

      cd.config.afterAuthorLinkParse?.(this.authorLink, beforeAuthorLinkParseReturn);
    } else {
      // Use the bootstrap author link.
      this.authorLink = authorLink;
      let pageName;
      if (this.author.isRegistered()) {
        pageName = 'User:' + this.author.getName();
        pagesToCheckExistence.push({
          pageName,
          link: this.authorLink,
        });
      } else {
        pageName = `${cd.g.contribsPages[0]}/${this.author.getName()}`;
      }
      this.authorLink.title = pageName;
      this.authorLink.href = mw.util.getUrl(pageName);
    }

    if (this.authorTalkLink) {
      // Move the existing author talk link to the header.
      if (this.extraSignatures.length) {
        this.authorTalkLink = /** @type {HTMLAnchorElement} */ (
          this.authorTalkLink.cloneNode(true)
        );
      }
      authorTalkLink.replaceWith(this.authorTalkLink);
      this.authorTalkLink.textContent = cd.s('comment-author-talk');
    } else {
      // Use the bootstrap author talk link.
      this.authorTalkLink = authorTalkLink;
      const pageName = 'User talk:' + this.author.getName();
      pagesToCheckExistence.push({
        pageName,
        link: this.authorTalkLink,
      });
      this.authorTalkLink.title = pageName;
      this.authorTalkLink.href = mw.util.getUrl(pageName);
    }

    bdiElement.textContent = this.author.getName();

    if (contribsLink && this.author.isRegistered()) {
      const pageName = `${cd.g.contribsPages[0]}/${this.author.getName()}`;
      contribsLink.title = pageName;
      contribsLink.href = mw.util.getUrl(pageName);
    }

    if (this.timestamp) {
      /**
       * "Copy link" button.
       *
       * @type {CommentButton}
       */
      this.copyLinkButton = new CommentButton({
        label: this.reformattedTimestamp || this.timestamp,
        tooltip: this.timestampTitle,
        classes: ['cd-comment-button-label', 'cd-comment-timestamp', 'mw-selflink-fragment'],
        action: this.copyLink.bind(this),
        href: this.dtId && '#' + this.dtId,
      });

      this.headerElement.appendChild(this.copyLinkButton.element);
      this.timestampElement = this.copyLinkButton.labelElement;
      if (this.date) {
        new LiveTimestamp(this.timestampElement, this.date, !this.hideTimezone).init();
      }
    }

    this.$header = /** @type {JQueryIfReformatted} */ ($(this.headerElement));

    this.rewrapHighlightables();
    this.highlightables[0].insertBefore(headerWrapper, this.highlightables[0].firstChild);

    if (!this.extraSignatures.length) {
      this.cleanUpSignature();
      this.signatureElement.remove();
    }

    return pagesToCheckExistence;
  }
}

export default Comment;
