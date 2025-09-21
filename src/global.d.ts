/// <reference types="types-mediawiki" />

import { ConvenientDiscussions } from './cd';
import CheckboxInputWidget from './CheckboxInputWidget';
import TextInputWidget from './TextInputWidget';

declare global {
  const IS_TEST: boolean;
  const IS_DEV: boolean;
  const IS_SINGLE: boolean;
  const CONFIG_FILE_NAME: string | null;
  const LANG_CODE: string | null;
  const moment: (...args: any) => any;

  const getInterwikiPrefixForHostname: (...args: any) => any;
  const getInterwikiPrefixForHostnameSync: (...args: any) => any;
  const getUrlFromInterwikiLink: (...args: any) => any;

  type Direction = 'ltr' | 'rtl';
  type ListType = 'dl' | 'ul' | 'ol';

  // Helper type to check if a string is present in the array
  type HasProperty<T extends readonly string[], K extends string> = K extends T[number]
    ? true
    : false;

  interface ApiResponseQueryPage {
    title: string;
    pageid: number;
    known?: boolean;
    missing?: boolean;
    invalid?: boolean;
    thumbnail?: {
      source: string;
      width: number;
      height: number;
    };
    pageprops?: {
      disambiguation?: '';
    };
    description?: string;
    ns: number;
    normalizedTitle?: string;
    index?: number;
    contentmodel: string;
    redirects?: { title: string }[];
    revisions?: Revision[];
  }

  interface BaseRevision {
    revid: number;
    parentid: number;
    slots?: {
      main: {
        contentmodel: string;
        contentformat: string;
        content: string;
        nosuchsection: boolean;
      };
    };
    comment: string;
    minor: boolean;
    timestamp: string;
    user: string;
  }

  export interface APIResponseTemplateData {
    pages: Pages;
  }

  export interface Pages {
    [x: string]: TemplateData;
  }

  interface TemplateData {
    title:       string;
    ns:          number;
    description: StringsByKey;
    params:      { [key: string]: Param };
    format:      string;
    paramOrder:  string[];
    sets:        AnyByKey[];
    maps:        AnyByKey[];
  }

  interface Param {
    description:     StringsByKey | null;
    type:            string;
    label:           StringsByKey | null;
    required:        boolean;
    suggested:       boolean;
    deprecated:      boolean;
    aliases:         any[];
    autovalue:       null | string;
    default:         null;
    suggestedvalues: string[];
    example:         StringsByKey | null;
  }

  // Generic Revision type that conditionally includes properties
  type Revision<T extends readonly string[] = ['ids', 'timestamp', 'flags', 'comment', 'user']> =
    Expand<BaseRevision & RevisionConditionalProperties<T>>;

  // Conditional type that adds properties based on the presence of strings in the array
  type RevisionConditionalProperties<T extends readonly string[]> =
    & (HasProperty<T, 'ids'> extends true ? { ids: string } : {})
    & (HasProperty<T, 'timestamp'> extends true ? { timestamp: string } : {})
    & (HasProperty<T, 'flags'> extends true ? { minor: boolean } : {})
    & (HasProperty<T, 'comment'> extends true ? { comment: string } : {})
    & (HasProperty<T, 'user'> extends true ? { user: string } : {})
    & (HasProperty<T, 'parsedcomment'> extends true ? { parsedcomment: string } : {});

  interface FromTo {
    from: string;
    to: string;
    tofragment?: string;
    index: number;
  }

  interface ApiResponseQueryBase {
    query?: {
      redirects?: FromTo[];
      normalized?: FromTo[];
    };
    curtimestamp?: string;
    batchcomplete?: boolean;
    continue?: object;
  }


  interface ApiResponseQueryContentPages {
    query?: {
      pages?: ApiResponseQueryPage[];
    };
  }

  type ApiResponseQuery<T extends object> = ApiResponseQueryBase & T;

  interface ApiResponseQueryContentGlobalUserInfo {
    query?: {
      globaluserinfo: {
        home: string;
        id: number;
        registration: string;
        name: string;
      };
    };
  }

  interface ApiResponseQueryContentAllUsers {
    query?: {
      allusers: {
        userid: number;
        name: string;
      }[];
    };
  }

  type ControlType = 'button' | 'checkbox' | 'copyText' | 'multicheckbox' | 'multilineText' | 'multitag' | 'number' | 'radio' | 'text' | 'title';

  interface ControlTypeToControl {
    'button': ButtonControl;
    'checkbox': CheckboxControl;
    'copyText': CopyTextControl;
    'multicheckbox': MulticheckboxControl;
    'multilineText': MultilineTextInputControl;
    'multitag': MultitagControl;
    'number': NumberControl;
    'radio': RadioControl;
    'title': TitleControl;
    'text': TextControl;
  }

  type ControlTypesByName<T extends { [K: string]: ControlType }> = {
    -readonly [K in keyof T]: ControlTypeToControl[T[K]];
  };

  interface GenericControl<T extends ControlType> {
    type: T;
    field: OO.ui.FieldLayout<ControlTypeToWidget[T]>;
    input: ControlTypeToWidget[T];
  }

  type ButtonControl = GenericControl<'button'>;

  type CheckboxControl = GenericControl<'checkbox'>;

  type CopyTextControl = Omit<GenericControl<'copyText'>, 'field'> & {
    field: OO.ui.CopyTextLayout | OO.ui.ActionFieldLayout;
  };

  type MulticheckboxControl = GenericControl<'multicheckbox'>;

  type MultilineTextInputControl = GenericControl<'multilineText'>;

  type MultitagControl = GenericControl<'multitag'> & {
    uiToData?: (value: string[]) => (string | [string, string])[];
  };

  type NumberControl = GenericControl<'number'>;

  type RadioControl = GenericControl<'radio'>;

  type TitleControl = GenericControl<'title'>;

  type TextControl = GenericControl<'text'>;

  interface ControlTypeToWidget {
    radio: OO.ui.RadioSelectWidget;
    text: TextInputWidget;
    multilineText: OO.ui.MultilineTextInputWidget;
    number: OO.ui.TextInputWidget;
    checkbox: CheckboxInputWidget;
    multitag: OO.ui.TagMultiselectWidget;
    multicheckbox: OO.ui.CheckboxMultiselectWidget;
    button: OO.ui.ButtonWidget;
    copyText: OO.ui.TextInputWidget;
    title: mw.widgets.TitleInputWidget;
  }

  interface Window {
    convenientDiscussions: ConvenientDiscussions;
    cd?: Window['convenientDiscussions'];

    // Basically we don't have a situation where getSelection() can return `null`, judging by
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection.
    getSelection(): Selection;

    cdOnlyRunByFooterLink?: boolean;
    cdShowLoadingOverlay?: boolean;
  }

  var convenientDiscussions: Window['convenientDiscussions'];

  // https://stackoverflow.com/a/71104272
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
      alignment?: 'top' | 'center' | 'bottom',
      smooth?: boolean,
      callback?: () => void,
    ): this;
    cdIsInViewport(partially?: boolean): boolean;
    cdScrollIntoView(alignment?: 'top'|'center'|'bottom', smooth?: boolean, callback?: () => void): this;
    cdGetText(): string;
    cdAddCloseButton(): this;
    cdRemoveCloseButton(): this;

    wikiEditor(funcName: 'addModule' | 'addToToolbar' | 'removeFromToolbar' | 'addDialog' | 'openDialog' | 'closeDialog', data: any): this;
  }

  interface Element {
    cdStyle: CSSStyleDeclaration;
    cdIsTopLayersContainer: boolean;
    cdCachedLayersContainerTop: number;
    cdCachedLayersContainerLeft: number;
    cdCouldHaveMoved: boolean;
    cdMarginTop: number;
    cdMarginBottom: number;
    cdMarginLeft: number;
    cdMarginRight: number;
    cdInput?: TextInputWidget;
  }

  namespace mw {
    const thanks: {
      thanked: number[];
    };

    namespace libs {
      namespace confirmEdit {
        type CaptchaData = any;

        class CaptchaInputWidget extends OO.ui.TextInputWidget {
          new(captchaData?: CaptchaData, config?: TextInputWidget.ConfigOptions);
          getCaptchaId(): string;
          getCaptchaWord(): string;
        }
      }
    }

    namespace widgets {
      function visibleCodePointLimit(textInputWidget: OO.ui.TextInputWidget, limit?: number, filterFunction?: (...args: any) => any): void;
    }
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
        $errorItems?: JQuery | null;
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
        | ((this: C) => boolean | number | JQuery.Promise<void> | Promise<void> | Error | [Error] | undefined);

      interface Constructor {
        /**
         * @param step Number of milliseconds to wait before proceeding,
         *   promise that must be resolved before proceeding, or a function to execute.
         *   See {@link Process.first first} for more information.
         * @param context Execution context of the function. The context is ignored if the step
         *   is a number or promise.
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
}

export {};
