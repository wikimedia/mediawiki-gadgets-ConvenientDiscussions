declare global {
  /**
   * Creates a tuple of N string types
   */
  type StringTuple<N extends number, T extends readonly string[] = []> =
    T['length'] extends N ? T : StringTuple<N, readonly [...T, string]>;

  type YargsNonAwaited = Exclude<ReturnType<typeof import('yargs')>['argv'], Promise<any>>;

  type MixinType<Mixin extends Constructor> = {
    new (...args: any[]): InstanceType<Mixin>;
    prototype: InstanceType<Mixin>;
  };
}

export {};
