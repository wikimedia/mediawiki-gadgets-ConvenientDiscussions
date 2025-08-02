/// <reference types="types-mediawiki" />

import CheckboxInputWidget from './CheckboxInputWidget';
import TextInputWidget from './TextInputWidget';

declare global {
  const IS_TEST: boolean;
  const IS_DEV: boolean;
  const IS_SINGLE: boolean;
  const CONFIG_FILE_NAME: string | null;
  const LANG_CODE: string | null;
  const moment: Function;

  const getInterwikiPrefixForHostname: Function;
  const getInterwikiPrefixForHostnameSync: Function;
  const getUrlFromInterwikiLink: Function;

  type Direction = 'ltr' | 'rtl';
  type ListType = 'dl' | 'ul' | 'ol';
  type StringsByKey = { [key: string]: string };
  type ValidKey = string | number;

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
    redirects?: Array<{ title: string }>;
    revisions?: Array<Revision>;
  }

  interface Revision {
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
  }

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
      allusers: Array<{
        userid: number;
        name: string;
      }>;
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
    uiToData?: (value: string[]) => (string|string[])[];
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
    // Basically we don't have a situation where getSelection() can return `null`, judging by
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection.
    getSelection(): Selection;

    cdOnlyRunByFooterLink?: boolean;
    cdShowLoadingOverlay?: boolean;
  }

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
    cdStyle: CSSStyleDeclaration;
    cdIsTopLayersContainer: boolean;
    cdCachedLayersContainerTop: number;
    cdCachedLayersContainerLeft: number;
    cdCouldHaveMoved: boolean;
    cdMarginTop: number;
    cdMarginBottom: number;
    cdMarginLeft: number;
    cdMarginRight: number;
    cdCallback?: Function;
    cdInput?: OO.ui.TextInputWidget;
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
