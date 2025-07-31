/**
 * Class for storing prototypes - skeletons/drafts of elements to be cloned instead of creating a
 * new one from scratch (which is often expensive). Also, functions that instantiate widgets with
 * certain characteristics (e.g. OOUI) may be stored.
 *
 * @template {{ [id: string]: any }} T Map of IDs to prototype types.
 * @template {{ [id: string]: () => any }} U Map of IDs to widget types.
 */
class PrototypeRegistry {
  /** @type {T} */
  elements = {};

  /** @type {U} */
  widgets = {};

  /**
   * Register a prototype.
   *
   * @param {string} id
   * @param {any} prototype
   */
  add(id, prototype) {
    this.elements[id] = prototype;
  }

  /**
   * Add a widget intended for creation of an object with certain characteristics (e.g. OOUI).
   *
   * @param {string} id
   * @param {() => any} widget
   */
  addWidget(id, widget) {
    this.widgets[id] = widget;
  }

  /**
   * Get a prototype or an instance of a widget.
   *
   * @param {string} id
   * @returns {HTMLElement}
   */
  get(id) {
    return id in this.elements
      ? /** @type {HTMLElement} */ (this.elements[id].cloneNode(true))
      : this.widgets[id]().$element[0];
  }

  /**
   * Get a widget.
   *
   * @param {string} id
   * @returns {() => OO.ui.Widget}
   */
  getWidget(id) {
    return this.widgets[id];
  }
}

export default PrototypeRegistry;
