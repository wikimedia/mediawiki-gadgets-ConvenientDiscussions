import Button from './Button';
import Comment from './Comment';
import CommentButton from './CommentButton';
import LiveTimestamp from './LiveTimestamp';
import PrototypeRegistry from './PrototypeRegistry';
import SpaciousCommentActions from './SpaciousCommentActions';
import cd from './cd';
import settings from './settings';
import CdError from './shared/CdError';
import { createSvg, getHigherNodeAndOffsetInSelection } from './utils-window';

/**
 * @typedef {object[]} ReplaceSignatureWithHeaderReturn
 * @property {string} pageName
 * @property {HTMLAnchorElement} link
 */

/**
 * A spacious comment class that handles spacious comment formatting with author/date headers
 * and structured layout.
 *
 * @augments Comment
 */
class SpaciousComment extends Comment {
  /**
   * Header element for spacious comments.
   *
   * @override
   * @type {HTMLElement}
   */
  headerElement;

  /**
   * Author element within the header.
   *
   * @type {HTMLElement}
   */
  authorElement;

  /**
   * Date element within the header.
   *
   * @type {HTMLElement}
   */
  dateElement;

  /**
   * Comment header jQuery wrapper.
   *
   * @override
   * @type {JQuery}
   */
  $header;

  /**
   * Comment menu jQuery wrapper.
   *
   * @override
   * @type {JQuery}
   */
  $menu;

  /**
   * Check whether the comment is reformatted (has a header and a menu instead of a signature).
   * Always returns true for spacious comments.
   *
   * @returns {boolean}
   * @override
   */
  isReformatted() {
    return true;
  }

  /**
   * Bind the standard events to a comment part.
   * For spacious comments, this is a no-op since they don't use hover events.
   *
   * @param {HTMLElement} element
   * @override
   */
  bindEvents = (element) => {
    // No-op for spacious comments
  };

  /**
   * Highlight the comment when hovered.
   * For spacious comments, this is a no-op since they don't use hover highlighting.
   *
   * @param {MouseEvent | TouchEvent} [event]
   * @override
   */
  highlightHovered(event) {
    // No-op for spacious comments
  }

  /**
   * Unhighlight the comment when it has lost focus.
   * For spacious comments, this is a no-op since they don't use hover highlighting.
   *
   * @param {boolean} [force]
   * @override
   */
  unhighlightHovered(force = false) {
    // No-op for spacious comments
  }

  /**
   * Update the toggle child threads button implementation for spacious comments.
   * Uses SVG icons from prototypes.
   *
   * @override
   */
  updateToggleChildThreadsButtonImpl() {
    this.actions.toggleChildThreadsButton.element.innerHTML = '';
    this.actions.toggleChildThreadsButton.element.append(
      Comment.prototypes.get(
        this.areChildThreadsCollapsed()
          ? 'expandChildThreadsButtonSvg'
          : 'collapseChildThreadsButtonSvg'
      )
    );
  }

  /**
   * Update the main timestamp element for spacious comments.
   * Only updates if there are extra signatures (timestamp is handled in header otherwise).
   *
   * @param {string} timestamp
   * @param {string} title
   * @protected
   */
  updateMainTimestampElement(timestamp, title) {
    if (this.extraSignatures.length) {
      this.timestampElement.textContent = timestamp;
      this.timestampElement.title = title;
      new LiveTimestamp(this.timestampElement, this.date, !this.hideTimezone).init();
    }
  }

  /**
   * Get separators for change note links in spacious comments.
   * Uses short format with dot separators.
   *
   * @param {string} stringName
   * @param {Button} [_refreshLink]
   * @returns {{ updatedStringName: string, refreshLinkSeparator: string, diffLinkSeparator: string }}
   * @override
   */
  getChangeNoteSeparators(stringName, _refreshLink) {
    return {
      updatedStringName: stringName + '-short',
      refreshLinkSeparator: cd.sParse('dot-separator'),
      diffLinkSeparator: cd.sParse('dot-separator'),
    };
  }

  /**
   * Implementation-specific structure initialization for spacious comments.
   * Replaces signature with header and adds menu.
   *
   * @protected
   */
  initializeCommentStructureImpl() {
    this.replaceSignatureWithHeader();
    this.addMenu();
  }

  /**
   * _For internal use._ Add a comment header to the top highlightable element. Remove the comment
   * signature unless there is more than one of them.
   *
   * @returns {ReplaceSignatureWithHeaderReturn} Pages to check existence of.
   */
  replaceSignatureWithHeader() {
    const pagesToCheckExistence = [];

    const headerWrapper = Comment.prototypes.get('headerWrapperElement');
    this.headerElement = /** @type {HTMLElement} */ (headerWrapper.firstChild);
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const authorWrapper = /** @type {HTMLElement} */ (this.headerElement.firstChild);
    const userInfoCardButton = /** @type {HTMLAnchorElement} */ (authorWrapper.firstChild);
    const authorLink = /** @type {HTMLAnchorElement} */ (userInfoCardButton.nextElementSibling);
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

    if (mw.user.options.get('checkuser-userinfocard-enable') && this.author.isRegistered()) {
      userInfoCardButton.dataset.username = this.author.getName();
      if (this.author.isTemporary()) {
        const span = /** @type {HTMLElement} */ (userInfoCardButton.firstChild);
        span.classList.remove('ext-checkuser-userinfocard-button__icon--userAvatar');
        span.classList.add('ext-checkuser-userinfocard-button__icon--userTemporary');
      }
    } else {
      userInfoCardButton.remove();
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
      this.authorLink.append(bdiElement);

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
      // Create actions composition for spacious comments
      if (!this.actions) {
        this.actions = new SpaciousCommentActions(this);
      }

      /**
       * "Copy link" button.
       *
       * @type {CommentButton}
       */
      this.actions.copyLinkButton = new CommentButton({
        label: this.reformattedTimestamp || this.timestamp,
        tooltip: this.timestampTitle,
        classes: ['cd-comment-button-labelled', 'cd-comment-timestamp', 'mw-selflink-fragment'],
        action: this.copyLink,
        href: this.dtId && '#' + this.dtId,
      });

      this.headerElement.append(this.actions.copyLinkButton.element);
      this.timestampElement = this.actions.copyLinkButton.labelElement;
      if (this.date) {
        new LiveTimestamp(this.timestampElement, this.date, !this.hideTimezone).init();
      }
    }

    this.$header = /** @type {JQuery} */ ($(this.headerElement));

    this.rewrapHighlightables();
    this.highlightables[0].insertBefore(headerWrapper, this.highlightables[0].firstChild);

    if (!this.extraSignatures.length) {
      this.cleanUpSignature();
      this.signatureElement.remove();
    }

    return pagesToCheckExistence;
  }

  /**
   * Implementation-specific logic for adding change note to spacious comments.
   * Adds the note to the header.
   *
   * @param {JQuery} $changeNote
   * @protected
   */
  addChangeNoteImpl($changeNote) {
    /** @type {JQuery} */ (this.$header).append($changeNote);
  }

  /**
   * Get the start point for selection range in spacious comments.
   * Uses the end of header element.
   *
   * @returns {{ startNode: Node, startOffset: number }}
   * @protected
   */
  getSelectionStartPoint() {
    return {
      startNode: this.headerElement,
      startOffset: this.headerElement.childNodes.length,
    };
  }

  /**
   * Get the end point for selection range in spacious comments.
   * Uses the beginning of menu element.
   *
   * @returns {{ endNode: Node, endOffset: number }}
   * @protected
   */
  getSelectionEndPoint() {
    return {
      endNode: this.menuElement,
      endOffset: 0,
    };
  }

  /**
   * Get the end boundary element for spacious comments.
   * Uses the menu element as the boundary.
   *
   * @returns {Element}
   * @protected
   */
  getSelectionEndBoundary() {
    return this.menuElement;
  }

  /**
   * _For internal use._ Add a menu to the bottom highlightable element of the comment and fill it
   * with buttons. Used when comment reformatting is enabled.
   */
  addMenu() {
    const menuElement = /** @type {HTMLElement} */ (document.createElement('div'));
    menuElement.className = 'cd-comment-menu';
    this.menuElement = /** @type {HTMLElement} */ (menuElement);
    this.$menu = /** @type {JQuery} */ ($(menuElement));

    this.addReplyButton();
    this.addEditButton();
    this.addThankButton();
    this.addGoToParentButton();

    // The menu may be re-added (after a comment's content is updated). We need to restore
    // something.
    this.maybeAddGoToChildButton();

    // We need a wrapper to ensure correct positioning in LTR-in-RTL situations and vice versa.
    const menuWrapper = document.createElement('div');
    menuWrapper.className = 'cd-comment-menu-wrapper';
    menuWrapper.append(this.menuElement);

    this.highlightables[this.highlightables.length - 1].append(menuWrapper);
  }

  /**
   * Initialize prototypes for spacious comments.
   * Creates header wrapper and SVG icon prototypes.
   *
   * @override
   */
  static initPrototypes() {
    // Call parent method to create shared prototypes (underlay, overlay)
    super.initPrototypes();

    // Create header wrapper element
    const headerElement = document.createElement('div');
    headerElement.className = 'cd-comment-header';

    const authorWrapper = document.createElement('div');
    authorWrapper.className = 'cd-comment-author-wrapper';
    headerElement.append(authorWrapper);

    // Add user info card button
    authorWrapper.append(Comment.createUserInfoCardButton());

    const authorLink = document.createElement('a');
    authorLink.className = 'cd-comment-author mw-userlink';
    authorWrapper.append(authorLink);

    const bdiElement = document.createElement('bdi');
    authorLink.append(bdiElement);

    const authorLinksWrapper = document.createElement('span');
    authorLinksWrapper.className = 'cd-comment-author-links';

    const authorTalkLink = document.createElement('a');
    authorTalkLink.textContent = cd.s('comment-author-talk');
    authorLinksWrapper.append(cd.mws('parentheses-start'), authorTalkLink);

    if (settings.get('showContribsLink')) {
      const separator = document.createElement('span');
      separator.innerHTML = cd.sParse('dot-separator');

      const contribsLink = document.createElement('a');
      contribsLink.textContent = cd.s('comment-author-contribs');

      authorLinksWrapper.append(separator, contribsLink);
    }

    authorLinksWrapper.append(cd.mws('parentheses-end'));
    authorWrapper.append(' ', authorLinksWrapper);

    // We need a wrapper to ensure correct positioning in LTR-in-RTL situations and vice versa.
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'cd-comment-header-wrapper';
    headerWrapper.append(headerElement);

    this.prototypes.add('headerWrapperElement', headerWrapper);

    // Create SVG icon prototypes
    this.prototypes.add(
      'goToParentButtonSvg',
      createSvg(16, 16, 20, 20).html(`<path d="M10 5l8 10H2z" />`)[0]
    );
    this.prototypes.add(
      'goToChildButtonSvg',
      createSvg(16, 16, 20, 20).html(`<path d="M10 15L2 5h16z" />`)[0]
    );
    this.prototypes.add(
      'collapseChildThreadsButtonSvg',
      createSvg(16, 16, 20, 20).html(`<path d="M4 9h12v2H4z" />`)[0]
    );
    this.prototypes.add(
      'expandChildThreadsButtonSvg',
      createSvg(16, 16, 20, 20).html(`<path d="M11 9V4H9v5H4v2h5v5h2v-5h5V9z" />`)[0]
    );
  }
}

export default SpaciousComment;
