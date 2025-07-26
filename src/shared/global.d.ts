/**
 * Type definitions shared between the main application and web worker
 */

declare interface WindowOrWorkerGlobalScope {
  convenientDiscussions: ConvenientDiscussions | ConvenientDiscussionsWorker;
  cd?: WindowOrWorkerGlobalScope['convenientDiscussions'];
}

// CommentWorker type definitions
declare interface CommentWorkerBase {
  id: string;
  index: number;
  authorName: string;
  timestamp: string | undefined;
  isOwn: boolean;
  isUnsigned: boolean;
  level: number;
  logicalLevel: number;
  date: Date | null;
  isOutdented: boolean;
  text: string;
  htmlToCompare: string;
  textHtmlToCompare: string;
  headingHtmlToCompare: string;
  elementNames: string[];
  elementClassNames: string[];
  hiddenElementsData: {
    type: string;
    tagName: string;
    html: string;
  }[];
  elementHtmls: string[];
}

declare interface CommentWorker extends CommentWorkerBase {
  children: CommentWorker[];
  previousComments: CommentWorker[];
  parent: CommentWorker | undefined;
  isToMe: boolean | undefined;
  section: SectionWorker | null;
}

// SectionWorker type definitions
declare interface SectionWorkerBase {
  id: string;
  index: number;
  level: number;
  headline: string;
  isArchived: boolean;
  commentsInFirstChunk: number;
  sourcePageName: string | null;
  headingNestingLevel: number;
}

declare interface SectionWorker extends SectionWorkerBase {
  parent: SectionWorker | undefined;
  ancestors: string[];
  oldestCommentId: string | undefined;
  comments: CommentWorker[];
}

// Worker message types
declare interface MessageFromWorkerParse {
  type: 'parse';
  revisionId: number;
  resolverId: number;
  comments: CommentWorker[];
  sections: SectionWorker[];
}

declare type ReplyFromWorker = MessageFromWorkerParse | undefined;

declare interface MessageFromWindowParse {
  type: 'parse';
  revisionId: number;
  resolverId: number;
  text: string;
  g: ConvenientDiscussions['g'];
  config: ConvenientDiscussions['config'];
}

declare interface MessageFromWindowSetAlarm {
  type: 'setAlarm';
  interval: number;
}

declare interface MessageFromWindowRemoveAlarm {
  type: 'removeAlarm';
}

declare type MessageFromWindow =
  | MessageFromWindowParse
  | MessageFromWindowSetAlarm
  | MessageFromWindowRemoveAlarm;

// NodeLike interfaces for cross-environment usage
declare interface NodeLike {
  textContent: string;
  nodeType: number;
  parentElement: ElementLike | null;
  nextSibling: NodeLike | null;
  previousSibling: NodeLike | null;
}

declare interface TextLike extends NodeLike {
  data: string;
}

declare interface ElementLike extends NodeLike {
  tagName: string;
  classList: {
    contains(className: string): boolean;
    add(...classNames: string[]): void;
  };
  getElementsByClassName(className: string, limit?: number): ElementLike[];
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  firstElementChild: ElementLike | null;
  lastElementChild: ElementLike | null;
  previousElementSibling: ElementLike | null;
  nextElementSibling: ElementLike | null;
  childNodes: NodeLike[];
  querySelectorAll(selectors: string): ElementLike[];
  className: string;
}

// Dom Handler interfaces extensions
declare namespace domhandler {
  interface Element {
    follows(node: Node): boolean;
    traverseSubtree(callback: (node: Node) => void): void;
    getElementsByClassName(className: string, limit?: number): Element[];
    getElementsByAttribute(attribute: RegExp): Element[];
    getElementsByTagName(tagName: string): Element[];
    contains(node: Node): boolean;
    filterRecursively(callback: (node: Node) => boolean): Node[];
    insertBefore(node: Node, refNode: Node | undefined): void;
    appendChild(node: Node): void;
    removeChild(node: Node): void;
    remove(): void;
    childElements: Element[];
    querySelector(selectors: string): Element | null;
    querySelectorAll(selectors: string): Element[];
  }

  interface Node {
    follows(node: Node): boolean;
    remove(): void;
  }

  interface Document {
    getElementsByTagName(tagName: string): Element[];
    getElementsByClassName(className: string, limit?: number): Element[];
    createTextNode(text: string): Text;
    createElement(tagName: string): Element;
  }

  interface Text extends Node {
    data: string;
  }
}

// Define interface for the DomHandlerDocument, Element, Node classes
interface DomHandlerDocument extends domhandler.Document {}
interface DomHandlerElement extends domhandler.Element {}
interface DomHandlerNode extends domhandler.Node {}

// Context object interface for Parser
interface Context {
  CommentClass: Constructor;
  SectionClass: Constructor;
  childElementsProp: string;
  follows: (el1: NodeLike, el2: NodeLike) => boolean;
  getAllTextNodes: () => TextLike[];
  getElementByClassName: (el: ElementLike, className: string) => ElementLike | null;
  rootElement: ElementLike;
  areThereOutdents: () => boolean;
  processAndRemoveDtElements: (elements: ElementLike[], bootProcess?: any) => void;
  removeDtButtonHtmlComments: () => void;
  contains: (el: ElementLike | null, node: NodeLike) => boolean;
  insertBefore: (parent: ElementLike, node: NodeLike, refNode: NodeLike | null) => unknown;
  appendChild: (parent: ElementLike, node: NodeLike) => void;
  remove: (node: NodeLike) => void;
  removeChild: (parent: ElementLike, node: NodeLike) => void;
}

// Generic constructor type
declare type Constructor = new (...args: any[]) => any;
