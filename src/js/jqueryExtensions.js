/**
 * jQuery extensions. See {@link external:jQuery.fn}.
 *
 * @module jqueryExtensions
 */

import cd from './cd';
import controller from './controller';
import { isMetadataNode, sleep } from './utils';

/**
 * jQuery. See {@link external:jQuery.fn} for extensions.
 *
 * @external jQuery
 * @type {object}
 * @see https://jquery.com/
 * @global
 */

/**
 * jQuery extensions.
 *
 * @namespace fn
 * @memberof external:jQuery
 */
export default {
  /**
   * Remove non-element nodes and metadata elements (`'STYLE'`, `'LINK'`) from a jQuery collection.
   *
   * @returns {external:jQuery}
   * @memberof external:jQuery.fn
   */
  cdRemoveNonElementNodes: function () {
    return this.filter(function () {
      return this.tagName && !isMetadataNode(this);
    });
  },

  /**
   * Scroll to the element.
   *
   * @param {'top'|'center'|'bottom'} [alignment='top'] Where should the element be positioned
   *   relative to the viewport.
   * @param {boolean} [smooth=true] Whether to use a smooth animation.
   * @param {Function} [callback] Callback to run after the animation has completed.
   * @returns {external:jQuery}
   * @memberof external:jQuery.fn
   */
  cdScrollTo(alignment = 'top', smooth = true, callback) {
    let $elements = this.cdRemoveNonElementNodes();

    // Filter out elements like those having `class="mw-empty-elt"`.
    const findFirstVisibleElementOffset = (direction) => {
      const elements = $elements.get();
      if (direction === 'backward') {
        elements.reverse();
      }
      for (const el of elements) {
        const offset = $(el).offset();
        if (!(offset.top === 0 && offset.left === 0)) {
          return offset;
        }
      }
      return null;
    }

    const offsetFirst = findFirstVisibleElementOffset('forward');
    const offsetLast = findFirstVisibleElementOffset('backward');
    if (!offsetFirst || !offsetLast) {
      mw.notify(cd.s('error-elementhidden'), { type: 'error' })
      return this;
    }
    const offsetBottom = offsetLast.top + $elements.last().outerHeight();

    let top;
    if (alignment === 'center') {
      top = Math.min(
        offsetFirst.top,
        offsetFirst.top + ((offsetBottom - offsetFirst.top) * 0.5) - $(window).height() * 0.5
      );
    } else if (alignment === 'bottom') {
      top = offsetBottom - $(window).height();
    } else {
      top = offsetFirst.top - cd.g.bodyScrollPaddingTop;
    }

    controller.toggleAutoScrolling(true);
    controller.scrollToY(top, smooth, callback);

    return this;
  },

  /**
   * Check if the element is in the viewport. Elements hidden with `display: none` are checked as if
   * they were visible. Elements inside other hidden elements return `false`.
   *
   * This method is not supposed to be used on element collections that are partially visible,
   * partially hidden, as it can't remember their state.
   *
   * @param {boolean} partially Return `true` even if only a part of the element is in the viewport.
   * @returns {?boolean}
   * @memberof external:jQuery.fn
   */
  cdIsInViewport(partially = false) {
    const $elements = this.cdRemoveNonElementNodes();

    // Workaround for hidden elements (use cases like checking if the add section form is in the
    // viewport).
    const wasHidden = $elements.get().every((el) => el.style.display === 'none');
    if (wasHidden) {
      $elements.show();
    }

    const elementTop = $elements.first().offset().top;
    const elementBottom = $elements.last().offset().top + $elements.last().height();

    // The element is hidden.
    if (elementTop === 0 && elementBottom === 0) {
      return false;
    }

    if (wasHidden) {
      $elements.hide();
    }

    const scrollTop = $(window).scrollTop();
    const viewportTop = scrollTop + cd.g.bodyScrollPaddingTop;
    const viewportBottom = scrollTop + $(window).height();

    return partially ?
      elementBottom > viewportTop && elementTop < viewportBottom :
      elementTop >= viewportTop && elementBottom <= viewportBottom;
  },

  /**
   * Scroll to the element if it is not in the viewport.
   *
   * @param {'top'|'center'|'bottom'} [alignment='top'] Where should the element be positioned
   *   relative to the viewport.
   * @param {boolean} [smooth=true] Whether to use a smooth animation.
   * @param {Function} [callback] Callback to run after the animation has completed.
   * @returns {external:jQuery}
   * @memberof external:jQuery.fn
   */
  cdScrollIntoView(alignment = 'top', smooth = true, callback) {
    if (this.cdIsInViewport()) {
      callback?.();
    } else {
      if (callback) {
        // Add `sleep()` for a more smooth animation in case there is `.focus()` in the callback.
        sleep().then(() => {
          this.cdScrollTo(alignment, smooth, callback);
        });
      } else {
        this.cdScrollTo(alignment, smooth, callback);
      }
    }

    return this;
  },

  /**
   * Get the element text as it is rendered in the browser, i.e. line breaks, paragraphs etc. are
   * taken into account. **This function is expensive.**
   *
   * @returns {string}
   * @memberof external:jQuery.fn
   */
  cdGetText() {
    let text;
    const dummyElement = document.createElement('div');
    [...this.get(0).childNodes].forEach((node) => {
      dummyElement.appendChild(node.cloneNode(true));
    });
    document.body.appendChild(dummyElement);
    text = dummyElement.innerText;
    dummyElement.remove();
    return text;
  },

  /**
   * Add a close button to the element.
   *
   * @returns {external:jQuery}
   * @memberof external:jQuery.fn
   */
  cdAddCloseButton() {
    if (this.find('.cd-closeButton').length) return this;

    const $closeButton = $('<a>')
      .attr('title', cd.s('cf-block-close'))
      .addClass('cd-closeButton')
      .on('click', () => {
        this.empty();
      });
    this.prepend($closeButton);

    return this;
  },
};
