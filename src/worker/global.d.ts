import { Document as DomHandlerDocument, Node as DomHandlerNode } from 'domhandler';

declare global {
  interface WorkerGlobalScope {
    Document: typeof DomHandlerDocument;
    Node: typeof DomHandlerNode;
    document?: DomHandlerDocument;
  }

  const Node: WorkerGlobalScope['Node'];

  // Remove optionality as a hack
  const document: NonNullable<WorkerGlobalScope['document']>;
}

export {};
