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
   * Bind events to comment elements.
   * Handles click and touch events for compact comment interaction.
   *
   * @param {HTMLElement} element
   * @override
   */
  bindEvents(element) {
    // Handle click events for comment highlighting and interaction
    element.addEventListener('click', (event) => {
      // Prevent default behavior for certain elements
      if (event.target?.tagName === 'A' || event.target?.closest('a')) {
        return;
      }

      // Highlight the comment when clicked
      this.scrollTo();
    });

    // Handle touch events for mobile interaction
    element.addEventListener('touchstart', (event) => {
      this.highlightHovered(event);
    });
  }

  /**
   * Initialize prototypes for compact comments.
   * Creates overlay menu prototypes and shared layer elements.
   *
   * @override
   */
  static initPrototypes() {
    // Call parent method to create shared prototypes (underlay, overlay)
    super.initPrototypes();

    // Get the base overlay prototype and enhance it with compact-specific elements
    const baseOverlay = this.prototypes.get('overlay');

    // Create compact-specific overlay menu elements
    const overlayInnerWrapper = document.createElement('div');
    overlayInnerWrapper.className = 'cd-comment-overlay-innerWrapper';
    baseOverlay.append(overlayInnerWrapper);

    const overlayGradient = document.createElement('div');
    overlayGradient.textContent = '\u00A0';
    overlayGradient.className = 'cd-comment-overlay-gradient';
    overlayInnerWrapper.append(overlayGradient);

    const overlayContent = document.createElement('div');
    overlayContent.className = 'cd-comment-overlay-content';
    overlayInnerWrapper.append(overlayContent);

    // Replace the base overlay with the enhanced version
    this.prototypes.add('overlay', baseOverlay);
  }
}

export default CompactComment;
