import { TextInputWidgetMixIn } from './TextInputWidget';
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
class MultilineTextInputWidget
  extends /** @type {OO.ui.MultilineTextInputWidget.Constructor & MixinType<typeof TextInputWidgetMixIn>} */ (
    OO.ui.MultilineTextInputWidget
  ) {}

es6ClassToOoJsClass(MultilineTextInputWidget);
mixInClass(MultilineTextInputWidget, TextInputWidgetMixIn);

export default MultilineTextInputWidget;
