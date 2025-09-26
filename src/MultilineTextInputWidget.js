import TextInputWidget from './TextInputWidget';
import { es6ClassToOoJsClass, mixInClass } from './utils-oojs';

/**
 * OOUI multiline text input widget.
 *
 * @class MultilineTextInputWidget
 * @memberof OO.ui
 * @see https://doc.wikimedia.org/oojs-ui/master/js/#!/api/OO.ui.MultilineTextInputWidget
 */

/**
 * Class that we use instead of
 * {@link OO.ui.MultilineTextInputWidget OO.ui.MultilineTextInputWidget} to include our
 * mixin.
 */
class MultilineTextInputWidget extends mixInClass(
  OO.ui.MultilineTextInputWidget,
  TextInputWidget
) {
  /** @type {boolean} */
  codeMirrorEnabled;

  /**
   * Focus the input and select a specified range within the text.
   *
   * @param {number} start Select from offset
   * @param {number} [end] Select to offset
   * @returns {this} The widget, for chaining
   * @override
   */
  selectRange(start, end = start) {
    this.focus();
    this.$input.textSelection('setSelection', { start, end });

    return this;
  };

  /**
   * Get an object describing the current selection range in a directional manner.
   *
   * @returns {{ from: number, to: number }}
   * @override
   */
  getRange() {
    const caretPosition = this.$input.textSelection('getCaretPosition', { startAndEnd: true });
    const start = caretPosition[0];
    const end = caretPosition[1];

    return {
      from: Math.min(start, end),
      to: Math.max(start, end),
    };
  }

  /**
   * Set the correspondent CodeMirror instance or `undefined` if CodeMirror is not active.
   *
   * @param {import('./CodeMirrorWikiEditor').default | undefined} codeMirror
   */
  setCodeMirror(codeMirror) {
    /** @type {import('./CodeMirrorWikiEditor').default} */
    this.codeMirror = codeMirror;
  }

  /**
   * Focus this element.
   *
   * @override
   * @returns {this}
   */
  focus() {
    if (this.codeMirror) {
      this.codeMirror.view.focus();

      return this;
    }

    return super.focus();
  }

  /**
   * Check if the widget is focused.
   *
   * @returns {boolean}
   */
  isFocused() {
    return this.codeMirror
      ? this.codeMirror.container.contains(document.activeElement)
      : this.$input.is(':focus');
  }
}

es6ClassToOoJsClass(MultilineTextInputWidget);

export default MultilineTextInputWidget;
