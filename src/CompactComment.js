import Button from './Button';
import Comment from './Comment';
import LiveTimestamp from './LiveTimestamp';
import PrototypeRegistry from './PrototypeRegistry';
import cd from './cd';
import { isInline } from './shared/utils-general';
import { getHigherNodeAndOffsetInSelection, limitSelectionAtEndBoundary } from './utils-window';

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
   * Add a note that the comment has been changed.
   * For compact comments, adds the note to the last block element.
   *
   * @param {JQuery} $changeNote
   * @override
   */
  addChangeNote($changeNote) {
    this.$changeNote = $changeNote;

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
   * Create a selection range for compact comments.
   * Uses first element as start and signature element as end.
   *
   * @returns {Range}
   * @override
   */
  createSelectionRange() {
    const range = document.createRange();
    range.setStart(this.elements[0], 0);
    range.setEnd(this.signatureElement, 0);

    return range;
  }

  /**
   * Make sure the selection doesn't include any subsequent text.
   * For compact comments, creates a temporary boundary element.
   *
   * @override
   */
  fixSelection() {
    const dummyEndBoundary = document.createElement('span');
    this.$elements.last().append(dummyEndBoundary);
    limitSelectionAtEndBoundary(dummyEndBoundary);
    dummyEndBoundary.remove();
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
   * Update timestamp elements for compact comments.
   * Always updates timestamp elements since compact comments don't use headers.
   *
   * @param {string} timestamp
   * @param {string} title
   * @override
   */
  updateTimestampElements(timestamp, title) {
    this.timestampElement.textContent = timestamp;
    this.timestampElement.title = title;
    new LiveTimestamp(this.timestampElement, this.date, !this.hideTimezone).init();
    this.extraSignatures.forEach((sig) => {
      if (!sig.timestampText) return;

      const { timestamp: extraSigTimestamp, title: extraSigTitle } = this.formatTimestamp(
        /** @type {Date} */ (sig.date),
        sig.timestampText
      );
      sig.timestampElement.textContent = extraSigTimestamp;
      sig.timestampElement.title = extraSigTitle;
      new LiveTimestamp(
        sig.timestampElement,
        /** @type {Date} */ (sig.date),
        !this.hideTimezone
      ).init();
    });
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
   * Initialize compact comment structure after parsing.
   * Sets up timestamp element and reformats timestamp.
   *
   * @override
   */
  initializeCommentStructure() {
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
