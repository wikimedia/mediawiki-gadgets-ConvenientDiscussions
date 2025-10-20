/**
 * Base class for managing comment visual layers (underlay and overlay).
 * Handles layer creation, destruction, positioning, and styling.
 */
class CommentLayers {
  /**
   * Comment's underlay as a native (non-jQuery) element.
   *
   * @type {HTMLElement | undefined}
   */
  underlay;

  /**
   * Comment's overlay.
   *
   * @type {HTMLElement | undefined}
   */
  overlay;

  /**
   * Line element in comment's overlay.
   *
   * @type {HTMLElement | undefined}
   */
  line;

  /**
   * Comment's side marker.
   *
   * @type {HTMLElement | undefined}
   */
  marker;

  /**
   * Comment's underlay as jQuery object.
   *
   * @type {JQuery | undefined}
   */
  $underlay;

  /**
   * Comment's overlay as jQuery object.
   *
   * @type {JQuery | undefined}
   */
  $overlay;

  /**
   * Comment's side marker as jQuery object.
   *
   * @type {JQuery | undefined}
   */
  $marker;

  /**
   * Reference to the parent comment.
   *
   * @type {import('./Comment').default}
   */
  comment;

  /**
   * Create a CommentLayers instance.
   *
   * @param {import('./Comment').default} comment The parent comment.
   */
  constructor(comment) {
    this.comment = comment;
  }

  /**
   * Create the layer elements (underlay, overlay, line, marker).
   * This method should be overridden by subclasses for specific layer configurations.
   */
  create() {
    // Import here to avoid circular dependency
    const Comment = require('./Comment').default;
    const commentManager = require('./commentManager').default;

    this.underlay = /** @type {HTMLElement} */ (Comment.prototypes.get('underlay'));
    commentManager.underlays.push(this.underlay);

    this.overlay = /** @type {HTMLElement} */ (Comment.prototypes.get('overlay'));
    this.line = /** @type {HTMLElement} */ (this.overlay.firstChild);
    this.marker = /** @type {HTMLElement} */ (
      /** @type {HTMLElement} */ (this.overlay.firstChild).nextSibling
    );

    this.updateStyles(true);

    // Create jQuery wrappers
    this.$underlay = /** @type {JQuery} */ ($(this.underlay));
    this.$overlay = /** @type {JQuery} */ ($(this.overlay));
    this.$marker = /** @type {JQuery} */ ($(this.marker));
  }

  /**
   * Destroy the layer elements and clean up references.
   */
  destroy() {
    if (this.underlay) {
      this.underlay.remove();
      this.underlay = undefined;
    }

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = undefined;
    }

    this.line = undefined;
    this.marker = undefined;
    this.$underlay = undefined;
    this.$overlay = undefined;
    this.$marker = undefined;
  }

  /**
   * Hide the comment menu. Base implementation does nothing.
   * Override in subclasses that have menu functionality.
   *
   * @param {Event} [_event] The event that triggered the hide action.
   */
  hideMenu(_event) {
    // Base implementation - no menu to hide
  }

  /**
   * Defer hiding the menu. Base implementation does nothing.
   * Override in subclasses that have menu functionality.
   *
   * @param {MouseEvent} _event The mousedown event.
   */
  deferHideMenu(_event) {
    // Base implementation - no menu to defer hiding
  }

  /**
   * Cancel the deferred menu hiding. Base implementation does nothing.
   * Override in subclasses that have menu functionality.
   */
  dontHideMenu() {
    // Base implementation - no timeout to clear
  }

  /**
   * Update layer styles and positioning.
   * This method should be overridden by subclasses for specific styling needs.
   *
   * @param {boolean} wereJustCreated Whether the layers were just created.
   */
  updateStyles(wereJustCreated = false) {
    if (!this.underlay || !this.overlay) return;

    // Apply common layer styling directly since updateClassesForFlag is private
    // This replicates the logic from Comment.updateClassesForFlag
    this.updateClassesForFlag('new', Boolean(this.comment.isNew));
    this.updateClassesForFlag('own', this.comment.isOwn);
    this.updateClassesForFlag('deleted', this.comment.isDeleted);

    if (wereJustCreated && this.comment.isLineGapped && this.line) {
      this.line.classList.add('cd-comment-overlay-line-gapCloser');
    }
  }

  /**
   * Set classes to the underlay, overlay, and other elements according to a comment flag.
   * This replicates the logic from Comment.updateClassesForFlag.
   *
   * @param {'new' | 'own' | 'target' | 'hovered' | 'deleted' | 'changed'} flag
   * @param {boolean} add
   */
  updateClassesForFlag(flag, add) {
    if (!this.underlay || !this.overlay) return;
    if (this.underlay.classList.contains(`cd-comment-underlay-${flag}`) === add) return;

    this.underlay.classList.toggle(`cd-comment-underlay-${flag}`, add);
    this.overlay.classList.toggle(`cd-comment-overlay-${flag}`, add);

    if (flag === 'deleted') {
      this.comment.actions?.replyButton?.setDisabled(add);
      this.comment.actions?.editButton?.setDisabled(add);
    }
  }
}

export default CommentLayers;
