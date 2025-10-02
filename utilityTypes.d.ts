declare global {
  type YargsNonAwaited = Exclude<ReturnType<typeof import('yargs')>['argv'], Promise<any>>;

  type MixinType<Mixin extends Constructor> = {
    new (...args: any[]): InstanceType<Mixin>;
    prototype: InstanceType<Mixin>;
  };

  /**
   * Creates a function type with N string parameters returning a string
   *
   * @example
   * type Callback0 = ReplaceCallback<0>; // () => string
   * type Callback2 = ReplaceCallback<2>; // (arg0: string, arg1: string) => string
   * type Callback5 = ReplaceCallback<5>; // (arg0: string, arg1: string, arg2: string, arg3: string, arg4: string) => string
   */
  type ReplaceCallback<N extends number = number> =
    number extends N
      ? (...args: string[]) => string
      : (...args: StringTuple<AddOne<N>>) => string;

  /**
   * Creates a tuple of N string types
   */
  type StringTuple<N extends number, T extends readonly string[] = []> =
    T['length'] extends N ? T : StringTuple<N, readonly [...T, string]>;

  /**
   * Adds 1 to a numeric type
   */
  type AddOne<N extends number> = [...StringTuple<N>, unknown]['length'];
}

export {};
