/**
 * Class for storing prototypes - skeletons/drafts of elements to be cloned instead of creating a
 * new one from scratch (which is often expensive).
 *
 * @template {{ [id: string]: Element }} T List of prototype IDs.
 */
class PrototypeRegistry {
  elements = /** @type {T} */ ({});

  /**
   * Register a prototype.
   *
   * @param {keyof T} id
   * @param {T[keyof T]} prototype
   */
  add(id, prototype) {
    this.elements[id] = prototype;
  }

  /**
   * Get a prototype or an instance of a widget.
   *
   * @param {keyof T} id
   * @returns {T[keyof T]}
   */
  get(id) {
    return /** @type {T[keyof T]}} */ (this.elements[id].cloneNode(true));
  }
}

export default PrototypeRegistry;
