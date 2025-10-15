import Comment from './Comment';
import PrototypeRegistry from './PrototypeRegistry';
import cd from './cd';
import settings from './settings';
import { createSvg } from './utils-window';

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
   * Format the header for spacious comments.
   * Creates and manages the author/date header structure.
   */
  formatHeader() {
    if (!this.headerElement) {
      this.headerElement = /** @type {HTMLElement} */ (
        SpaciousComment.prototypes.get('headerWrapperElement')
      );

      // Find the author and date elements within the header
      const authorElement = this.headerElement.querySelector('.cd-comment-author');
      const dateElement = this.headerElement.querySelector('.cd-comment-timestamp');

      if (authorElement) {
        this.authorElement = /** @type {HTMLElement} */ (authorElement);
      }
      if (dateElement) {
        this.dateElement = /** @type {HTMLElement} */ (dateElement);
      }

      this.$header = $(this.headerElement);
    }

    // Update author information
    if (this.authorElement) {
      this.authorElement.textContent = this.author.name;
      if (this.authorElement instanceof HTMLAnchorElement) {
        const userPageName = `${this.author.getNamespaceAlias()}:${this.author.name}`;
        this.authorElement.href = mw.util.getUrl(userPageName);
      }
    }

    // Update timestamp information
    if (this.dateElement) {
      this.dateElement.textContent = this.timestampElement.textContent;
      this.dateElement.title = this.timestampElement.title;
    }
  }

  /**
   * Initialize prototypes for spacious comments.
   * Creates header wrapper and SVG icon prototypes.
   *
   * @override
   */
  static initPrototypes() {
    this.prototypes = new PrototypeRegistry();

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

    // Create shared prototypes (underlay, overlay)
    const commentUnderlay = document.createElement('div');
    commentUnderlay.className = 'cd-comment-underlay';

    const commentOverlay = document.createElement('div');
    commentOverlay.className = 'cd-comment-overlay';

    const overlayLine = document.createElement('div');
    overlayLine.className = 'cd-comment-overlay-line';
    commentOverlay.append(overlayLine);

    const overlayMarker = document.createElement('div');
    overlayMarker.className = 'cd-comment-overlay-marker';
    commentOverlay.append(overlayMarker);

    this.prototypes.add('underlay', commentUnderlay);
    this.prototypes.add('overlay', commentOverlay);
  }
}

export default SpaciousComment;
