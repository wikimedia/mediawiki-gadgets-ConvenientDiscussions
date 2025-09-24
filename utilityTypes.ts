/**
 * Creates a tuple of N string types
 */
type StringTuple<N extends number, T extends readonly string[] = []> =
  T['length'] extends N ? T : StringTuple<N, readonly [...T, string]>;

/**
 * Creates a function type with N string parameters returning a string
 *
 * @example
 * type Callback0 = ReplaceCallback<0>; // () => string
 * type Callback2 = ReplaceCallback<2>; // (arg0: string, arg1: string) => string
 * type Callback5 = ReplaceCallback<5>; // (arg0: string, arg1: string, arg2: string, arg3: string, arg4: string) => string
 */
type ReplaceCallback<N extends number> = (...args: StringTuple<N>) => string;

type YargsNonAwaited = Exclude<ReturnType<typeof import('yargs')>['argv'], Promise<any>>;
