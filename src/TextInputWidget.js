import { convertHtmlToWikitext } from './utils-api';
import { es6ClassToOoJsClass, mixInClass } from './utils-oojs';
import { cleanUpPasteDom, getElementFromPasteHtml, isElementConvertibleToWikitext } from './utils-window';

/**
 * An input was changed manually.
 *
 * @param {*} value Value of the input.
 */

/**
 * Mixin for {@link OO.ui.TextInputWidget OO.ui.TextInputWidget}. It adds some features we need.
 */
class TextInputWidgetMixIn {
  /**
   * Create a text input widget.
   *
   * @this TextInputWidget
   */
  constructor() {
    this.$input.on('input', () => {
      this.emit('manualChange', this.getValue());
    });
  }

  /**
   * Insert text while keeping the undo/redo functionality.
   *
   * @this TextInputWidget
   * @param {string} text
   * @returns {TextInputWidget}
   */
  cdInsertContent(text) {
    this.focus();
    if (!document.execCommand('insertText', false, text)) {
      this.insertContent(text);
    }

    return this;
  }

  /**
   * Given a selection, get its content as wikitext.
   *
   * @this TextInputWidget
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
   * @this TextInputWidget
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
   * @this TextInputWidget
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
}

es6ClassToOoJsClass(TextInputWidgetMixIn);

/**
 * Class that extends {@link OO.ui.TextInputWidget OO.ui.TextInputWidget} and adds some
 * features we need.
 */
class TextInputWidget extends mixInClass(OO.ui.TextInputWidget, TextInputWidgetMixIn) {}
es6ClassToOoJsClass(TextInputWidget);

export default TextInputWidget;
export { TextInputWidgetMixIn };
