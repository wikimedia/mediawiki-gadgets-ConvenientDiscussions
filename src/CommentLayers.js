import { sleep } from './shared/utils-general.js';

/**
 * Base class for managing comment visual layers (underlay and overlay).
 * Handles layer creation, destruction, positioning, and styling.
 */
class CommentLayers {
  /**
   * Comment's underlay as a native (non-jQuery) element.
   *
   * @type {HTMLElement}
   */
  underlay;

  /**
   * Comment's overlay.
   *
   * @type {HTMLElement}
   */
  overlay;

  /**
   * Line element in comment's overlay.
   *
   * @type {HTMLElement}
   */
  line;

  /**
   * Comment's side marker.
   *
   * @type {HTMLElement}
   */
  marker;

  /**
   * Comment's underlay as jQuery object.
   *
   * @type {JQuery}
   */
  $underlay;

  /**
   * Comment's overlay as jQuery object.
   *
   * @type {JQuery}
   */
  $overlay;

  /**
   * Comment's side marker as jQuery object.
   *
   * @type {JQuery}
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
    this.$underlay = $(this.underlay);
    this.$overlay = $(this.overlay);
    this.$marker = $(this.marker);
  }

  /**
   * Destroy the layer elements and clean up references.
   */
  destroy() {
    this.underlay.remove();
    this.overlay.remove();

    // Note: Properties are set to undefined for cleanup, but TypeScript expects them to always exist
    // This is acceptable since destroy() should only be called when the comment is being removed
    /** @type {any} */ (this).underlay = undefined;
    /** @type {any} */ (this).overlay = undefined;
    /** @type {any} */ (this).line = undefined;
    /** @type {any} */ (this).marker = undefined;
    /** @type {any} */ (this).$underlay = undefined;
    /** @type {any} */ (this).$overlay = undefined;
    /** @type {any} */ (this).$marker = undefined;
  }

  /**
   * Update layer styles and positioning.
   * This method should be overridden by subclasses for specific styling needs.
   *
   * @param {boolean} wereJustCreated Whether the layers were just created.
   */
  updateStyles(wereJustCreated = false) {
    // Apply common layer styling
    this.updateClassesForFlag('new', Boolean(this.comment.isNew));
    this.updateClassesForFlag('own', this.comment.isOwn);
    this.updateClassesForFlag('deleted', this.comment.isDeleted);

    if (wereJustCreated && this.comment.isLineGapped) {
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
    if (this.underlay.classList.contains(`cd-comment-underlay-${flag}`) === add) return;

    this.underlay.classList.toggle(`cd-comment-underlay-${flag}`, add);
    this.overlay.classList.toggle(`cd-comment-overlay-${flag}`, add);

    if (flag === 'deleted') {
      this.comment.actions?.replyButton?.setDisabled(add);
      this.comment.actions?.editButton?.setDisabled(add);
    }
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
   * Add the (already existent) comment's layers to the DOM.
   */
  addLayers() {
    this.updateLayersOffset();
    this.comment.getLayersContainer().append(this.underlay);
    this.comment.getLayersContainer().append(this.overlay);
  }

  /**
   * _For internal use._ Transfer the `layers(Top|Left|Width|Height)` values to the style of the
   * layers.
   */
  updateLayersOffset() {
    // The underlay can be absent if called from commentManager.maybeRedrawLayers() with redrawAll
    // set to `true`. layersOffset can be absent in some rare cases when the comment became
    // invisible.
    if (!this.comment.layersOffset) return;

    this.underlay.style.top = this.overlay.style.top = String(this.comment.layersOffset.top) + 'px';
    this.underlay.style.left = this.overlay.style.left = String(this.comment.layersOffset.left) + 'px';
    this.underlay.style.width = this.overlay.style.width = String(this.comment.layersOffset.width) + 'px';
    this.underlay.style.height = this.overlay.style.height = String(this.comment.layersOffset.height) + 'px';

    this.comment.toggleChildThreadsPopup?.position();
  }

  /**
   * Calculate the underlay and overlay offset and set it to the `layersOffset` property.
   *
   * @param {object} [options]
   * @returns {boolean | undefined} Is the comment moved. `null` if it is invisible.
   */
  computeLayersOffset(options = {}) {
    const layersContainerOffset = this.comment.getLayersContainerOffset();
    if (!layersContainerOffset) return;

    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const hasMoved = this.comment.getOffset({
      ...options,
      considerFloating: true,
      set: true,
    });

    if (this.comment.offset) {
      const margins = this.comment.getMargins();
      this.comment.layersOffset = {
        top: this.comment.offset.top - layersContainerOffset.top,
        left: this.comment.offset.left - margins.left - layersContainerOffset.left,
        width: this.comment.offset.right + margins.right - (this.comment.offset.left - margins.left),
        height: this.comment.offset.bottom - this.comment.offset.top,
      };
    } else {
      this.comment.layersOffset = undefined;
    }

    return hasMoved;
  }

  /**
   * Animate the comment's background and marker color to the provided colors. (Called from
   * {@link CommentLayers#animateBack}.)
   *
   * @param {string} markerColor
   * @param {string} backgroundColor
   * @param {() => void} [callback] Function to run when the animation is concluded.
   */
  animateToColors(markerColor, backgroundColor, callback) {
    const generateProperties = (/** @type {string} */ color) => {
      const properties = /** @type {CSSStyleDeclaration} */ ({ backgroundColor: color });

      // jquery.color module can't animate to the transparent color.
      if (properties.backgroundColor === 'rgba(0, 0, 0, 0)') {
        properties.opacity = '0';
      }

      return properties;
    };
    const propertyDefaults = {
      backgroundColor: '',
      backgroundImage: '',
      opacity: '',
    };

    this.$marker.animate(generateProperties(markerColor), 400, 'swing', () => {
      this.$marker.css(propertyDefaults);
    });

    const $background = /** @type {JQuery} */ (this.comment.$animatedBackground);
    const layers = this;
    $background.animate(generateProperties(backgroundColor), 400, 'swing', function complete() {
      if (this !== $background.get(-1)) return;

      callback?.();
      // Check if this is a CompactCommentLayers instance by checking for $overlayGradient property
      $background.add(
        /** @type {any} */ (layers).$overlayGradient || $()
      ).css(propertyDefaults);
    });
  }

  /**
   * Animate the comment's background and marker color back from the colors of a given comment flag.
   *
   * @param {'new' | 'own' | 'target' | 'hovered' | 'deleted' | 'changed'} flag
   * @param {() => void} [callback]
   */
  animateBack(flag, callback) {
    if (!this.$underlay.parent().length) {
      callback?.();

      return;
    }

    // Get the current colors
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const initialMarkerColor = this.$marker.css('background-color');
    const initialBackgroundColor = this.$underlay.css('background-color');

    // Reset the classes that produce these colors
    this.updateClassesForFlag(flag, false);

    // Get the final (destination) colors
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const finalMarkerColor = this.$marker.css('background-color');
    let finalBackgroundColor = this.$underlay.css('background-color');

    // That's basically if the flash color is green (when a comment is changed after an edit) and
    // the comment itself is green. We animate to transparent, then set green back, so that there is
    // any animation at all.
    if (finalBackgroundColor === initialBackgroundColor) {
      finalBackgroundColor = 'rgba(0, 0, 0, 0)';
    }

    // Set back the colors previously produced by classes
    this.$marker.css({
      backgroundColor: initialMarkerColor,
      opacity: 1,
    });
    /** @type {JQuery} */ (this.comment.$animatedBackground).css({
      backgroundColor: initialBackgroundColor,
    });
    // Check if this is a CompactCommentLayers instance by checking for $overlayGradient property
    if (/** @type {any} */ (this).$overlayGradient) {
      /** @type {any} */ (this).$overlayGradient.css({ backgroundImage: 'none' });
    }

    this.animateToColors(finalMarkerColor, finalBackgroundColor, callback);
  }

  /**
   * Change the comment's background and marker color to a color of the provided comment flag for
   * the given number of milliseconds, then smoothly change it back.
   *
   * @param {'new' | 'own' | 'target' | 'hovered' | 'deleted' | 'changed'} flag
   * @param {number} delay
   * @param {() => void} [callback]
   */
  flash(flag, delay, callback) {
    this.comment.configureLayers();
    if (!this.comment.layers) {
      callback?.();

      return;
    }

    /**
     * Comment underlay and menu, whose colors are animated in some events.
     *
     * @type {JQuery|undefined}
     */
    // Check if this is a CompactCommentLayers instance by checking for $overlayMenu property
    this.comment.$animatedBackground = this.$underlay.add(
      /** @type {any} */ (this).$overlayMenu || $()
    );

    // Reset animations and colors
    this.comment.$animatedBackground.add(this.$marker).stop(true, true);

    this.updateClassesForFlag(flag, true);

    // If there was an animation scheduled, cancel it
    this.comment.unhighlightDeferred?.reject();

    this.comment.unhighlightDeferred = $.Deferred();
    this.comment.unhighlightDeferred.then(() => {
      this.animateBack(flag, callback);
    });

    sleep(delay).then(() => this.comment.unhighlightDeferred?.resolve());
  }
}

export default CommentLayers;
