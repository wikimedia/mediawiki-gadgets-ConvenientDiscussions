/**
 * Class for storing prototypes - skeletons/drafts of elements to be cloned instead of creating a
 * new one from scratch (which is often expensive).
 *
 * @template {string} T List of prototype IDs.
 */
class PrototypeRegistry {
  elements = /** @type {{ [id in T]: HTMLElement }} */ ({});

  /**
   * Register a prototype.
   *
   * @param {keyof T} id
   * @param {HTMLElement} prototype
   */
  add(id, prototype) {
    this.elements[id] = prototype;
  }

  /**
   * Get a prototype or an instance of a widget.
   *
   * @param {keyof T} id
   * @returns {HTMLElement}
   */
  get(id) {
    return /** @type {HTMLElement} */ (this.elements[id].cloneNode(true));
  }
}

export default PrototypeRegistry;
