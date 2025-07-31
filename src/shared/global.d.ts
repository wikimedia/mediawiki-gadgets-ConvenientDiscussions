/**
 * This file has types for the code shared between the main and worker parts of the script.
 */

import { Document as DomHandlerDocument } from 'domhandler';

import BootProcess from '../BootProcess';
import WorkerCommentWorker from '../worker/CommentWorker';
import WorkerSectionWorker from '../worker/SectionWorker';
import { ConvenientDiscussions, ConvenientDiscussionsWorker } from './cd';
import CommentSkeleton from './CommentSkeleton';
import SectionSkeleton from './SectionSkeleton';

declare global {
  type MessageFromWorkerParse = {
    type: 'parse',
    revisionId: number,
    resolverId: number,
    comments: CommentWorker[],
    sections: SectionWorker[],
  };

  type MessageFromWindowParse = {
    type: 'parse',
    revisionId: number,
    resolverId: number,
    text: string,
    g: ConvenientDiscussions['g'],
    config: ConvenientDiscussions['config'],
  };

  type MessageFromWindowSetAlarm = {
    type: 'setAlarm',
    interval: number,
  };

  type MessageFromWindowRemoveAlarm = {
    type: 'removeAlarm',
  };

  type MessageFromWindow = MessageFromWindowParse | MessageFromWindowSetAlarm | MessageFromWindowRemoveAlarm;

  interface WindowOrWorkerGlobalScope {
    convenientDiscussions: ConvenientDiscussions | ConvenientDiscussionsWorker;
    cd?: WindowOrWorkerGlobalScope['convenientDiscussions'];
    document: Document | DomHandlerDocument;
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

  namespace mw {
    const thanks: {
      thanked: number[];
    };

    namespace libs {
      namespace confirmEdit {
        class CaptchaInputWidget extends OO.ui.TextInputWidget {
          new (config?: captchaData);
          getCaptchaId(): string;
          getCaptchaWord(): string;
        }
      }
    }

    namespace widgets {
      function visibleCodePointLimit(textInputWidget: OO.ui.TextInputWidget, limit?: number, filterFunction?: Function): void;

      // interface TitleInputWidget
      //   extends OO.ui.TitleInputWidget,
      //     mw.widgets.TitleWidget,
      //     OO.ui.mixin.LookupElement {
      //   new (config: OO.ui.TitleInputWidget);
      // }
    }

    // namespace Upload {
    //   interface DialogConfig {
    //     bookletClass?: typeof mw.Upload.BookletLayout;
    //     booklet?: object;
    //   }

    //   class Dialog extends OO.ui.ProcessDialog {
    //     static name: string;
    //     static title: string | Function;
    //     static actions: Array<{
    //       flags: string | string[];
    //       action: string;
    //       label: string;
    //       modes: string | string[];
    //     }>;

    //     constructor(config?: DialogConfig);

    //     protected createUploadBooklet(): mw.Upload.BookletLayout;
    //     protected onUploadBookletSet(page: OO.ui.PageLayout): void;
    //     protected onUploadValid(isValid: boolean): void;
    //     protected onInfoValid(isValid: boolean): void;

    //     protected bookletClass: typeof mw.Upload.BookletLayout;
    //     protected bookletConfig: object;
    //     protected uploadBooklet: mw.Upload.BookletLayout;
    //   }
    // }
  }

  namespace OO.ui {
    namespace Window {
      interface Props {
        $body: JQuery;
      }
    }

    namespace Dialog {
      interface Props {
        actions: ActionSet;
      }
    }

    namespace ProcessDialog {
      interface Prototype {
        showErrors(errors: OO.ui.Error[] | OO.ui.Error): void;
        hideErrors(): void;
      }

      interface Props {
        $errors: JQuery;
        $errorItems: JQuery;
      }
    }

    namespace MessageDialog {
      interface Props {
        text: PanelLayout;
        title: OO.ui.LabelWidget;
      }
    }

    interface Process {
      next<C = null>(step: Process.StepOverride<C>, context?: C): this;
    }

    // Add native Promise since it seems to work and we use it
    namespace Process {
      type StepOverride<C> =
        | number
        | JQuery.Promise<void>
        | Promise<void>
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        | ((this: C) => boolean | number | JQuery.Promise<void> | Promise<void> | Error | [Error] | void);

      interface Constructor {
        /**
         * @param step Number of milliseconds to wait before proceeding,
         * promise that must be resolved before proceeding, or a function to execute.
         * See {@link Process.first first} for more information.
         * @param context Execution context of the function. The context is ignored if the step
         * is a number or promise.
         */
        new<C = null>(step?: StepOverride<C>, context?: C): Process;
      }
    }

    namespace PageLayout {
      interface Props {
        outlineItem: OutlineOptionWidget | null;
      }

      interface Prototype {
        setupOutlineItem(): void;
      }
    }

    namespace RadioOptionWidget {
      interface Props {
        radio: OO.ui.RadioInputWidget;
      }
    }

    namespace RadioSelectWidget {
      interface Prototype {
        findSelectedItem(): OptionWidget | null;
      }
    }
  }

  interface JQueryStatic {
    _data(element: Element, key: string): any;
    wikiEditor: any;
  }

  type ElementLike = Element | DomHandlerElement;
  type NodeLike = Node | DomHandlerNode;
  type TextLike = Text | DomHandlerText;

  interface CommentWorker extends WorkerCommentWorker {}
  interface SectionWorker extends WorkerSectionWorker {}

  type AnyNode = import('domhandler').Node | globalThis.Node;
  type AnyElement = import('domhandler').Element | globalThis.Element;

  type ElementFor<T extends AnyNode> = T extends import('domhandler').Node ? import('domhandler').Element : Element;
  type TextFor<T extends AnyNode> = T extends import('domhandler').Node ? import('domhandler').Text : Text;

  interface ParsingContext<T extends AnyNode> {
    // Classes
    CommentClass: typeof CommentSkeleton<T>;
    SectionClass: typeof SectionSkeleton<T>;

    // Properties
    childElementsProp: string;
    rootElement: ElementFor<T>;

    // Non-DOM methods
    areThereOutdents: () => boolean;
    processAndRemoveDtElements: (elements: ElementFor<T>[], bootProcess: BootProcess) => void;
    removeDtButtonHtmlComments: () => void;

    // DOM methods
    appendChild: (parent: ElementFor<T>, child: T) => void;
    contains: (el: ElementFor<T>, node: T) => boolean;
    follows: (el1: T, el2: T) => boolean;
    getAllTextNodes: () => TextFor<T>[];
    getElementByClassName: (element: ElementFor<T>, className: string) => ElementFor<T> | null;
    insertBefore: (parent: ElementFor<T>, node: T, referenceNode: T | null) => void;
    remove: (node: T) => void;
    removeChild: (parent: ElementFor<T>, child: T) => void;
  }
}

export {};
