/**
 *
 */
export default class CodeMirrorCommentInput
  extends /** @type {typeof import('./CodeMirrorWikiEditor').default} */ (
    mw.loader.require('ext.CodeMirror.v6.WikiEditor')
  )
{
  /**
   *
   * @param {import('./MultilineTextInputWidget').default} commentInput
   */
  constructor(commentInput) {
    super(commentInput.$input, mw.loader.require('ext.CodeMirror.v6.mode.mediawiki')());

    /** @type {{
     *   Compartment: typeof import('@codemirror/state').Compartment
     *   placeholder: import('@codemirror/view').placeholder
     * }} */
    this.lib = mw.loader.require('ext.CodeMirror.v6.lib');
    this.placeholderCompartment = new this.lib.Compartment();

    // Hack to fix duplicate IDs
    /** @type {import('../../mediawiki-extensions-CodeMirror/resources/codemirror.panel.js')} */
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const codeMirrorPanelPrototype = Object.getPrototypeOf(Object.getPrototypeOf(this.preferences));
    /** @type {import('../../mediawiki-extensions-CodeMirror/resources/codemirror.codex.js')} */
    // eslint-disable-next-line no-one-time-vars/no-one-time-vars
    const codeMirrorCodexPrototype = Object.getPrototypeOf(codeMirrorPanelPrototype);
    codeMirrorPanelPrototype.getCheckbox = (name, ...args) =>
      codeMirrorCodexPrototype.getCheckbox(name + '-' + Math.random(), ...args);
  }

  /**
   * @param {import('@codemirror/state').Extension[]} [extensions=[]]
   * @param {string} [placeholderText='']
   * @override
   */
  initialize(extensions = [], placeholderText = '') {
    this.mode = 'mediawiki';
    extensions.push(this.placeholderCompartment.of(this.lib.placeholder(placeholderText)));
    super.initialize([this.defaultExtensions, ...extensions]);
  }

  /**
   * @param {string} text
   */
  updatePlaceholder(text) {
    this.view.dispatch({
      effects: this.placeholderCompartment.reconfigure(this.lib.placeholder(text)),
    });
  }
}
