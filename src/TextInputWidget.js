import TextInputWidgetMixin from './TextInputWidgetMixin';
import { es6ClassToOoJsClass, mixInClass } from './utils-oojs';

/**
 * An input was changed manually.
 *
 * @param {*} value Value of the input.
 */

/**
 * Class that extends {@link OO.ui.TextInputWidget OO.ui.TextInputWidget} and adds some
 * features we need.
 */
class TextInputWidget extends mixInClass(OO.ui.TextInputWidget, TextInputWidgetMixin) {
  /**
   * Create a text input widget.
   *
   * @param  {...any} args
   */
  constructor(...args) {
    super(...args);

    this.construct();
  }
}

es6ClassToOoJsClass(TextInputWidget);

export default TextInputWidget;
