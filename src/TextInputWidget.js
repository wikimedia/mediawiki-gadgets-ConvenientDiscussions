import { convertHtmlToWikitext } from './utils-api';
import { es6ClassToOoJsClass } from './utils-oojs';
import { cleanUpPasteDom, getElementFromPasteHtml, isElementConvertibleToWikitext } from './utils-window';

/**
 * An input was changed manually.
 *
 * @param {*} value Value of the input.
 */

/**
 * Class that extends {@link OO.ui.TextInputWidget OO.ui.TextInputWidget} and adds some
 * features we need.
 */
class TextInputWidget extends OO.ui.TextInputWidget {
  /**
   * Create a text input widget.
   *
   * @param  {...any} args
   */
  constructor(...args) {
    super(...args);

    this.construct();
  }

  construct() {
    /**
     * Text that was selected before typing an autocomplete trigger.
     *
     * @type {string | undefined}
     * @private
     */
    this.selectedTextForAutocomplete = undefined;

    /**
     * Whether the autocomplete menu is currently active. When active, the selected text
     * should be immutable.
     *
     * @type {boolean}
     * @private
     */
    this.autocompleteMenuActive = false;

    this.$input.on('input', () => {
      this.emit('manualChange', this.getValue());
    });

    // Use selectionchange event to capture all selection changes properly
    // This handles Ctrl+A, Ctrl+Z, and all other selection-changing operations
    this.boundSelectionChangeHandler = this.handleSelectionChange.bind(this);
    document.addEventListener('selectionchange', this.boundSelectionChangeHandler);
  }

  /**
   * Insert text while keeping the undo/redo functionality.
   *
   * @param {string} content
   * @returns {this}
   * @override
   */
  insertContent(content) {
    this.focus();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (!document.execCommand('insertText', false, content)) {
      super.insertContent(content);
    }

    return this;
  }

  /**
   * Given a selection, get its content as wikitext.
   *
   * @returns {Promise<string>}
   */
  async getWikitextFromSelection() {
    const div = document.createElement('div');
    if (window.getSelection().type === 'Range') {
      div.append(window.getSelection().getRangeAt(0).cloneContents());

      return await this.maybeConvertElementToWikitext(cleanUpPasteDom(div, this.$element[0]));
    }

    return '';
  }

  /**
   * Convert HTML code of a paste into wikitext.
   *
   * @param {string} html Pasted HTML.
   * @returns {Promise<string>}
   */
  getWikitextFromPaste(html) {
    return this.maybeConvertElementToWikitext(
      cleanUpPasteDom(getElementFromPasteHtml(html), this.$element[0])
    );
  }

  /**
   * Given the return value of {@link module:utilsWindow.cleanUpPasteDom}, convert the HTML to
   * wikitext if necessary.
   *
   * @param {object} data Return value of {@link module:utilsWindow.cleanUpPasteDom}.
   * @param {Element} data.element
   * @param {string} data.text
   * @param {Array.<string|undefined>} data.syntaxHighlightLanguages
   * @returns {Promise<string>}
   */
  async maybeConvertElementToWikitext({ element, text, syntaxHighlightLanguages }) {
    if (!isElementConvertibleToWikitext(element)) {
      return text;
    }

    this.pushPending().setDisabled(true);
    const wikitext = await convertHtmlToWikitext(element.innerHTML, syntaxHighlightLanguages);
    this.popPending().setDisabled(false);

    return wikitext ?? text;
  }

  /**
   * Handle selection changes in the document. Only updates the stored selection
   * if the autocomplete menu is not active.
   *
   * @private
   */
  handleSelectionChange() {
    // Only update selection if this input is focused and autocomplete menu is not active
    if (document.activeElement === this.$input[0] && !this.autocompleteMenuActive) {
      this.updateSelectedTextForAutocomplete();
    }
  }

  /**
   * Update the selected text for autocomplete based on current selection.
   *
   * @private
   */
  updateSelectedTextForAutocomplete() {
    const element = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (this.$input[0]);
    const start = element.selectionStart;
    const end = element.selectionEnd;

    // Only capture selection if there's actually selected text
    this.selectedTextForAutocomplete = (start !== end && start !== null && end !== null)
      ? element.value.substring(start, end)
      : undefined;
  }

  /**
   * Set the autocomplete menu active state. When active, the selected text becomes immutable.
   *
   * @param {boolean} active Whether the autocomplete menu is active
   */
  setAutocompleteMenuActive(active) {
    this.autocompleteMenuActive = active;
  }

  /**
   * Get the text that was selected before typing an autocomplete trigger.
   *
   * @returns {string | undefined} The selected text, or undefined if none
   */
  getSelectedTextForAutocomplete() {
    return this.selectedTextForAutocomplete;
  }

  /**
   * Clear the selected text for autocomplete. This should be called when the user types
   * something other than an autocomplete trigger.
   */
  clearSelectedTextForAutocomplete() {
    this.selectedTextForAutocomplete = undefined;
  }

  /**
   * Clean up event listeners when the widget is destroyed.
   */
  destroy() {
    if (this.boundSelectionChangeHandler) {
      document.removeEventListener('selectionchange', this.boundSelectionChangeHandler);
    }
    // Call parent destroy if it exists
    const parentProto = Object.getPrototypeOf(Object.getPrototypeOf(this));
    if (parentProto.destroy) {
      parentProto.destroy.call(this);
    }
  }
}

es6ClassToOoJsClass(TextInputWidget);

export default TextInputWidget;
