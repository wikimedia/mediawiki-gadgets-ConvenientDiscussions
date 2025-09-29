declare global {
  type YargsNonAwaited = Exclude<ReturnType<typeof import('yargs')>['argv'], Promise<any>>;

  type MixinType<Mixin extends Constructor> = {
    new (...args: any[]): InstanceType<Mixin>;
    prototype: InstanceType<Mixin>;
  };
}

export {};
