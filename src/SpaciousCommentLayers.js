import CommentLayers from './CommentLayers.js';

/**
 * Specialized layer management for spacious comments.
 * Handles spacious-specific layer positioning and styling without overlay menu.
 */
class SpaciousCommentLayers extends CommentLayers {
  /**
   * Create the layer elements for spacious comments.
   * Spacious comments have standard underlay, overlay, line, and marker elements
   * but no overlay menu components.
   *
   * @override
   */
  create() {
    // Call parent create method to set up basic layers
    super.create();

    // Spacious comments don't have overlay menu elements, so no additional setup needed
    // The base implementation already creates underlay, overlay, line, and marker
  }

  /**
   * Update layer styles for spacious comments.
   * Spacious comments have specific positioning and styling requirements.
   *
   * @param {boolean} [wereJustCreated] Whether the layers were just created.
   * @override
   */
  updateStyles(wereJustCreated = false) {
    // Call parent updateStyles for common styling
    super.updateStyles(wereJustCreated);

    // Spacious-specific styling would go here
    // For now, the base implementation handles the common styling needs
  }
}

export default SpaciousCommentLayers;
