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

    /**
     * Text that was selected before typing an autocomplete trigger.
     *
     * @type {string | undefined}
     * @private
     */
    this.selectedTextForAutocomplete = undefined;

    this.$input.on('input', () => {
      this.emit('manualChange', this.getValue());
    });

    // Track selection changes to capture selected text for autocomplete
    // Only capture on mouseup to avoid clearing on every keystroke
    this.$input.on('mouseup', () => {
      this.updateSelectedTextForAutocomplete();
    });

    // Also track on keyup, but only for selection keys (Shift+Arrow, etc.)
    this.$input.on('keyup', (event) => {
      // Only update selection if shift key was involved (selection keys)
      if (
        event.shiftKey ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        this.updateSelectedTextForAutocomplete();
      }
    });
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
}

es6ClassToOoJsClass(TextInputWidget);

export default TextInputWidget;
