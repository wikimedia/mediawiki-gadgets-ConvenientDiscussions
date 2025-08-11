/**
 * This file has types for the code shared between the main and worker parts of the script.
 */


import BootProcess from '../BootProcess';
import BrowserComment from '../Comment';
import Section from '../Section';
import WorkerCommentWorker from '../worker/CommentWorker';
import WorkerSectionWorker from '../worker/SectionWorker';
import { ConvenientDiscussionsBase } from './cd';
import { HeadingTarget, SignatureTarget, Target } from './Parser';

declare global {
  type StringsByKey = { [key: string]: string };
  type NumbersByKey = { [key: string]: number };
  type AnyByKey = { [key: string]: any };
  type StringArraysByKey = { [key: string]: string[] };

  interface Message {
    type: string;
    [key: string]: any;
  }

  interface MessageFromWorkerParse extends Message {
    type: 'parse';
    revisionId: number;
    resolverId: number;
    comments: CommentWorker[];
    sections: SectionWorker[];
  }

  interface MessageFromWindowParse extends Message {
    type: 'parse';
    revisionId: number;
    resolverId: number;
    text: string;
    g: ConvenientDiscussionsBase['g'];
    config: ConvenientDiscussionsBase['config'];
  }

  interface MessageFromWindowSetAlarm extends Message {
    type: 'setAlarm';
    interval: number;
  }

  interface MessageFromWindowRemoveAlarm extends Message {
    type: 'removeAlarm';
  }

  type MessageFromWindow = MessageFromWindowParse | MessageFromWindowSetAlarm | MessageFromWindowRemoveAlarm;

  interface WindowOrWorkerGlobalScope {
    convenientDiscussions: ConvenientDiscussionsBase;
    cd?: WindowOrWorkerGlobalScope['convenientDiscussions'];
    Node: {
      ELEMENT_NODE: number;
      TEXT_NODE: number;
      COMMENT_NODE: number;
    };
  }

  // https://stackoverflow.com/a/71104272
  const convenientDiscussions: WindowOrWorkerGlobalScope['convenientDiscussions'];
  const cd: WindowOrWorkerGlobalScope['convenientDiscussions'] | undefined;

  interface String {
    /**
     * Gets a substring beginning at the specified location and having the specified length.
     * (Deprecation removed.)
     *
     * @param from The starting position of the desired substring. The index of the first character
     *   in the string is zero.
     * @param length The number of characters to include in the returned substring.
     */
    substr(from: number, length?: number): string;
  }

  interface JQuery {
    cdRemoveNonElementNodes(): void;
    cdScrollTo(
      alignment: 'top' | 'center' | 'bottom' = 'top',
      smooth = true,
      callback?: () => void,
    ): this;
    cdIsInViewport(partially = false): boolean;
    cdScrollIntoView(alignment: 'top'|'center'|'bottom' = 'top', smooth = true, callback?: () => void): this;
    cdGetText(): string;
    cdAddCloseButton(): this;
    cdRemoveCloseButton(): this;

    wikiEditor(funcName: 'addModule' | 'addToToolbar' | 'removeFromToolbar' | 'addDialog' | 'openDialog' | 'closeDialog', data: any): this;
  }

  interface Element {
    cdIsInline?: boolean;

    // Hack: Exclude `null` which is not done in the native lib
    textContent: string;
  }

  interface Text {
    // Hack: Exclude `null` which is not done in the native lib
    textContent: string;
  }

  interface Comment {
    // Hack: Exclude `null` which is not done in the native lib
    textContent: string;
  }

  interface ChildNode {
    // Hack: Exclude `null` which is not done in the native lib
    textContent: string;
  }

  // type ElementLike = Element | DomHandlerElement;
  // type NodeLike = Node | DomHandlerNode;
  // type TextLike = Text | DomHandlerText;

  interface CommentWorker extends WorkerCommentWorker {}
  interface SectionWorker extends WorkerSectionWorker {}

  type AnyNode = import('domhandler').Node | globalThis.Node;
  type AnyElement = import('domhandler').Element | globalThis.Element;
  type AnyText = import('domhandler').Text | globalThis.Text;

  type NodeLike = AnyNode;
  type ElementLike = AnyElement;
  type HTMLElementLike = import('domhandler').Element | globalThis.HTMLElement;
  type TextLike = AnyText;

  type ElementFor<T extends AnyNode> = T extends import('domhandler').Node
    ? import('domhandler').Element
    : T extends Node
      ? Element
      : ElementLike;
  type DocumentFor<T extends AnyNode> = T extends import('domhandler').Node
    ? import('domhandler').Document
    : T extends Node
      ? Document
      : DocumentLike;
  type HTMLElementFor<T extends AnyNode> = T extends import('domhandler').Node
    ? import('domhandler').Element
    : T extends Node
      ? HTMLElement
      : HTMLElementLike;
  type TextFor<T extends AnyNode> = T extends import('domhandler').Node ? import('domhandler').Text : Text;

  interface ParsingContext<T extends AnyNode> {
    // Classes
    CommentClass: new (parser: Parser<T>, signature: SignatureTarget<T>, targets: Target<T>[]) => T extends import('domhandler').Node ? CommentWorker : BrowserComment;
    SectionClass: new (parser: Parser<T>, heading: HeadingTarget<T>, targets: Target<T>[], subscriptions: Subscriptions) => T extends import('domhandler').Node ? SectionWorker : Section;

    // Properties
    childElementsProp: string;
    rootElement: ElementFor<T>;
    document: DocumentFor<T>;

    // Non-DOM methods
    areThereOutdents: () => boolean;
    processAndRemoveDtElements: (elements: ElementFor<T>[], bootProcess: BootProcess) => void;
    removeDtButtonHtmlComments: () => void;

    // DOM methods
    follows: (el1: T, el2: T) => boolean;
    getAllTextNodes: () => TextLike[];
    getElementByClassName: (element: ElementLike, className: string) => ElementLike | null;
  }
}

export {};
