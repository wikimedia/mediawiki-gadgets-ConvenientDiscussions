import Comment from './Comment';
import PrototypeRegistry from './PrototypeRegistry';

/**
 * A compact comment class that handles compact MediaWiki talk page formatting
 * with traditional layout and overlay menu-based actions.
 *
 * @augments Comment
 */
class CompactComment extends Comment {
  /**
   * Is the comment currently being hovered over.
   *
   * @type {boolean}
   */
  isHovered = false;

  /**
   * Was the overlay menu manually hidden by the user.
   *
   * @type {boolean}
   */
  wasMenuHidden = false;

  /**
   * Highlight the comment when hovered.
   * Handles hover behavior and menu display for compact comments.
   *
   * @override
   * @param {MouseEvent | TouchEvent} [event] The triggering event
   */
  highlightHovered(event) {
    if (this.wasMenuHidden && event?.type === 'touchstart') {
      this.wasMenuHidden = false;

      return;
    }

    // Call parent method
    super.highlightHovered(event);
  }

  /**
   * Initialize prototypes for compact comments.
   * Creates overlay menu prototypes and shared layer elements.
   *
   * @override
   */
  static initPrototypes() {
    this.prototypes = new PrototypeRegistry();

    // Create shared layer elements (underlay, overlay)
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

    // Create compact-specific overlay menu elements
    const overlayInnerWrapper = document.createElement('div');
    overlayInnerWrapper.className = 'cd-comment-overlay-innerWrapper';
    commentOverlay.append(overlayInnerWrapper);

    const overlayGradient = document.createElement('div');
    overlayGradient.textContent = '\u00A0';
    overlayGradient.className = 'cd-comment-overlay-gradient';
    overlayInnerWrapper.append(overlayGradient);

    const overlayContent = document.createElement('div');
    overlayContent.className = 'cd-comment-overlay-content';
    overlayInnerWrapper.append(overlayContent);

    this.prototypes.add('underlay', commentUnderlay);
    this.prototypes.add('overlay', commentOverlay);
  }
}

export default CompactComment;
