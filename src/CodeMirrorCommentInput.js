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
     *   EditorView: typeof import('@codemirror/view').EditorView
     *   placeholder: import('@codemirror/view').placeholder
     * }} */
    this.lib = mw.loader.require('ext.CodeMirror.v6.lib');
    this.cdPlaceholderCompartment = new this.lib.Compartment();
    this.cdChangeExtension = this.lib.EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        this.textarea.dispatchEvent(new KeyboardEvent('input'));
      }
    });
    this.cdContentClassExtension = this.lib.EditorView.contentAttributes.of({
      class: 'ime-position-inside',
    });

    mw.hook('ext.CodeMirror.preferences.apply').add((prefName, enabled) => {
      if (enabled !== this.preferences.getPreference(prefName)) {
        this.extensionRegistry.toggle(prefName, this.view, enabled);
        // Only update the preferences property directly to avoid
        // making API calls already made by the primary instance.
        // @ts-expect-error: the source library uses "@type {Object}"
        this.preferences.preferences[prefName] = enabled;
      }
    });


  }

  /**
   * @param {import('@codemirror/state').Extension[]} [extensions=[]]
   * @param {string} [placeholderText='']
   * @override
   */
  initialize(extensions = [], placeholderText = '') {
    this.mode = 'mediawiki';
    extensions.push(
      this.cdPlaceholderCompartment.of(this.lib.placeholder(placeholderText)),
      this.cdChangeExtension,
      this.cdContentClassExtension,
    );
    super.initialize([this.defaultExtensions, ...extensions]);
  }

  /**
   * @param {string} text
   */
  updatePlaceholder(text) {
    this.view.dispatch({
      effects: this.cdPlaceholderCompartment.reconfigure(this.lib.placeholder(text)),
    });
  }
}
