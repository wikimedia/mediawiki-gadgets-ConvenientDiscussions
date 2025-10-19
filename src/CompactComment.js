import Button from './Button';
import Comment from './Comment';
import LiveTimestamp from './LiveTimestamp';
import PrototypeRegistry from './PrototypeRegistry';
import cd from './cd';
import { isInline } from './shared/utils-general';
import { getHigherNodeAndOffsetInSelection } from './utils-window';

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
   * Check whether the comment is reformatted (has a header and a menu instead of a signature).
   * Always returns false for compact comments.
   *
   * @returns {boolean}
   * @override
   */
  isReformatted() {
    return false;
  }

  /**
   * Bind the standard events to a comment part.
   * For compact comments, handles hover events for overlay menu display.
   *
   * @param {HTMLElement} element
   * @override
   */
  bindEvents = (element) => {
    element.addEventListener('mouseenter', this.highlightHovered.bind(this));
    element.addEventListener('mouseleave', () => {
      this.unhighlightHovered();
    });
    element.addEventListener('touchstart', this.highlightHovered.bind(this));
  };

  /**
   * Implementation-specific logic for adding change note to compact comments.
   * Adds the note to the last block element.
   *
   * @param {JQuery} $changeNote
   * @protected
   */
  addChangeNoteImpl($changeNote) {
    // Add the mark to the last block element, going as many nesting levels down as needed to
    // avoid it appearing after a block element.
    let $last;
    let $tested = $(this.highlightables).last();
    do {
      $last = $tested;
      $tested = $last.children().last();
    } while ($tested.length && !isInline($tested[0]));

    if (!$last.find('.cd-changeNote-before').length) {
      $last.append(' ', $('<span>').addClass('cd-changeNote-before'));
    }
    $last.append($changeNote);
  }

  /**
   * Get the start point for selection range in compact comments.
   * Uses the beginning of first element.
   *
   * @returns {{ startNode: Node, startOffset: number }}
   * @protected
   */
  getSelectionStartPoint() {
    return {
      startNode: this.elements[0],
      startOffset: 0,
    };
  }

  /**
   * Get the end point for selection range in compact comments.
   * Uses the beginning of signature element.
   *
   * @returns {{ endNode: Node, endOffset: number }}
   * @protected
   */
  getSelectionEndPoint() {
    return {
      endNode: this.signatureElement,
      endOffset: 0,
    };
  }

  /**
   * Get the end boundary element for compact comments.
   * Creates a temporary boundary element.
   *
   * @returns {Element}
   * @protected
   */
  getSelectionEndBoundary() {
    const dummyEndBoundary = document.createElement('span');
    this.$elements.last().append(dummyEndBoundary);

    return dummyEndBoundary;
  }

  /**
   * Clean up the temporary boundary element for compact comments.
   *
   * @param {Element} endBoundary
   * @protected
   */
  cleanupSelectionEndBoundary(endBoundary) {
    endBoundary.remove();
  }

  /**
   * Update the toggle child threads button implementation for compact comments.
   * Uses OOUI icons.
   *
   * @override
   */
  updateToggleChildThreadsButtonImpl() {
    this.actions.toggleChildThreadsButton.setIcon(this.areChildThreadsCollapsed() ? 'add' : 'subtract');
  }

  /**
   * Update the main timestamp element for compact comments.
   * Always updates since compact comments don't use headers.
   *
   * @param {string} timestamp
   * @param {string} title
   * @protected
   */
  updateMainTimestampElement(timestamp, title) {
    this.timestampElement.textContent = timestamp;
    this.timestampElement.title = title;
    new LiveTimestamp(this.timestampElement, this.date, !this.hideTimezone).init();
  }

  /**
   * Get separators for change note links in compact comments.
   * Uses space separators with conditional dot separator for diff link.
   *
   * @param {string} stringName
   * @param {Button} [refreshLink]
   * @returns {{ updatedStringName: string, refreshLinkSeparator: string, diffLinkSeparator: string }}
   * @override
   */
  getChangeNoteSeparators(stringName, refreshLink) {
    return {
      updatedStringName: stringName,
      refreshLinkSeparator: ' ',
      diffLinkSeparator: refreshLink ? cd.sParse('dot-separator') : ' ',
    };
  }

  /**
   * Implementation-specific structure initialization for compact comments.
   * Sets up timestamp element and reformats timestamp.
   *
   * @protected
   */
  initializeCommentStructureImpl() {
    this.timestampElement = this.$elements.find('.cd-signature .cd-timestamp')[0];
    this.reformatTimestamp();
  }

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
