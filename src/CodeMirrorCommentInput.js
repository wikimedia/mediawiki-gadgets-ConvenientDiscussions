/**
 *
 */
export default class CodeMirrorCommentInput
  extends /** @type {typeof import('./CodeMirrorWikiEditor').CodeMirrorWikiEditor} */ (
    mw.loader.require('ext.CodeMirror.v6.WikiEditor')
  )
{
  /**
   *
   * @param {import('./MultilineTextInputWidget').default} commentInput
   */
  constructor(commentInput) {
    super(commentInput.$input, mw.loader.require('ext.CodeMirror.v6.mode.mediawiki')());

    this.mode = 'mediawiki';

    const extensions = [
      .../** @type {import('@codemirror/state').Extension[]} */ (this.defaultExtensions),
    ];

    /** @type {{
     *   Compartment: typeof import('@codemirror/state').Compartment
     *   placeholder: import('@codemirror/view').placeholder
     * }} */
    const { Compartment, placeholder } = mw.loader.require('ext.CodeMirror.v6.lib');
    this.placeholderCompartment = new Compartment();
    extensions.push(this.placeholderCompartment.of(placeholder('Initial placeholder text')));

    this.initialize(extensions);
  }

  /**
   * @param {string} text
   */
  updatePlaceholder(text) {
    const { placeholder } = mw.loader.require('ext.CodeMirror.v6.lib');
    this.view.dispatch({
      effects: this.placeholderCompartment.reconfigure(placeholder(text)),
    });
  }
}
