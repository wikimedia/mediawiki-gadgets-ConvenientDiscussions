/**
 * Class for storing prototypes - skeletons/drafts of elements to be cloned instead of creating a
 * new one from scratch (which is often expensive).
 *
 * @template {string} T List of prototype IDs.
 */
class PrototypeRegistry {
  elements = /** @type {{ [id in T]: Element }} */ ({});

  /**
   * Register a prototype.
   *
   * @param {T} id
   * @param {Element} prototype
   */
  add(id, prototype) {
    this.elements[id] = prototype;
  }

  /**
   * Get a prototype or an instance of a widget.
   *
   * @param {T} id
   * @returns {Element}
   */
  get(id) {
    return /** @type {Element} */ (this.elements[id].cloneNode(true));
  }
}

export default PrototypeRegistry;
