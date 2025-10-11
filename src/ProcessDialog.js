import bootManager from './bootManager';
import cd from './cd';
import CdError from './shared/CdError';
import { es6ClassToOoJsClass, mixInClass } from './utils-oojs';

/**
 * Mixin that adds process dialog functionality.
 */
class ProcessDialogMixin {
  /**
   * Initialize the mixin.
   *
   * @this {ProcessDialogMixin & OO.ui.ProcessDialog}
   */
  construct() {
    // Workaround to make this.constructor in methods to be type-checked correctly
    /** @type {typeof ProcessDialog} */
    // eslint-disable-next-line no-self-assign
    this.constructor = this.constructor;
  }

  /**
   * Check if there are unsaved changes.
   *
   * @this {ProcessDialogMixin & OO.ui.ProcessDialog}
   * @returns {boolean}
   */
  isUnsaved() {
    const saveButton = this.actions.get({ actions: 'save' })[0];

    return saveButton?.isVisible() && !saveButton.isDisabled();
  }

  /**
   * Confirm closing the dialog.
   *
   * @this {ProcessDialogMixin & OO.ui.ProcessDialog}
   */
  confirmClose() {
    if (!this.isUnsaved() || confirm(cd.s(`${this.constructor.cdKey || 'dialog'}-close-confirm`))) {
      this.close({ action: 'close' });
      bootManager.removePreventUnloadCondition('dialog');
    }
  }

  /**
   * Handle a error, displaying a message with the provided name and popping the pending state. If
   * the error is not recoverable, the dialog is closed on "Dismiss".
   *
   * @this {ProcessDialogMixin & OO.ui.ProcessDialog}
   * @param {unknown} error
   * @param {string} [messageName]
   * @param {boolean} [recoverable]
   * @protected
   */
  handleError(error, messageName, recoverable) {
    let errorInstance;
    if (error instanceof CdError) {
      let message = cd.s(/** @type {string} */ (messageName));
      if (error.getType() === 'network') {
        message += ' ' + cd.s('error-network');
      }
      errorInstance = new OO.ui.Error(message, { recoverable });
    } else {
      errorInstance = new OO.ui.Error(cd.s('error-javascript'), { recoverable: false });
    }

    this.showErrors(errorInstance);
    console.warn(error);
    this.$errors
      .find('.oo-ui-buttonElement:not(.oo-ui-flaggedElement-primary) > .oo-ui-buttonElement-button')
      .on('click', () => {
        if (recoverable) {
          this.updateSize();
        } else {
          this.close();
        }
      });

    this.actions.setAbilities({ close: true });
    this.updateSize();
    this.popPending();
  }
}

/**
 * Our class that extends {@link OO.ui.ProcessDialog OO.ui.ProcessDialog}, adding a couple
 * of methods to it.
 *
 * @augments OO.ui.ProcessDialog
 */
class ProcessDialog extends mixInClass(OO.ui.ProcessDialog, ProcessDialogMixin) {
  /**
   * @type {string}
   * @abstract
   */
  static cdKey;
}

es6ClassToOoJsClass(ProcessDialog);

export default ProcessDialog;
export { ProcessDialogMixin };
