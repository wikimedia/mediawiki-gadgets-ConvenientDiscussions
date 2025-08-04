import { Document as DomHandlerDocument, Node as DomHandlerNode } from 'domhandler';
import { ConvenientDiscussionsWorker } from '../shared/cd';

declare global {
  interface WorkerGlobalScope {
    Document: typeof DomHandlerDocument;
    Node: typeof DomHandlerNode;
    document?: DomHandlerDocument;

    convenientDiscussions: ConvenientDiscussionsWorker;
    cd?: WorkerGlobalScope['convenientDiscussions'];
  }

  const Node: WorkerGlobalScope['Node'];

  // Remove optionality as a hack
  const document: NonNullable<WorkerGlobalScope['document']>;
}

export {};
