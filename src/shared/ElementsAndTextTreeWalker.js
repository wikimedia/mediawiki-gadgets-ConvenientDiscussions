import TreeWalker from './TreeWalker';
import { isElement, isText } from './utils-general';

/**
 * Tree walker that walks on both element and text nodes.
 *
 * @template {AnyNode} N
 * @augments TreeWalker<ElementFor<N>|TextFor<N>>
 */
class ElementsAndTextTreeWalker extends TreeWalker {
  /**
   * Create an elements and text {@link TreeWalker tree walker}.
   *
   * @param {ElementFor<N>|TextFor<N>} root
   * @param {ElementFor<N>|TextFor<N>} [startNode]
   */
  constructor(root, startNode) {
    super(root, (node) => isText(node) || isElement(node), false, startNode);
  }
}

export default ElementsAndTextTreeWalker;
