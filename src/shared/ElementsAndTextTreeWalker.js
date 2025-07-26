import TreeWalker from './TreeWalker.js';
import { isElement, isText } from './utils-general.js';

/**
 * Tree walker that walks on both element and text nodes.
 *
 * @augments TreeWalker<ElementLike|TextLike>
 */
class ElementsAndTextTreeWalker extends TreeWalker {
  /**
   * Create an elements and text {@link TreeWalker tree walker}.
   *
   * @param {ElementLike|TextLike} root
   * @param {ElementLike|TextLike} [startNode]
   */
  constructor(root, startNode) {
    super(root, (node) => isText(node) || isElement(node), false, startNode);
  }
}

export default ElementsAndTextTreeWalker;
