declare global {
  type Constructor = new (...arguments_: any[]) => object;
  type AtLeastOne<T> = [T, ...T[]];
  type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
  type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
  // type ExpandRecursively<T> = T extends object
  //   ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  //   : T;
  type ValueOf<T> = Expand<T[keyof T]>;
  type RemoveMethods<T> = {
    [K in keyof T as T[K] extends AnyFunction ? never : K]: T[K]
  };

  /**
   * Creates a function type with N string parameters returning a string
   *
   * @example
   * type Callback0 = ReplaceCallback<0>; // () => string
   * type Callback2 = ReplaceCallback<2>; // (arg0: string, arg1: string) => string
   * type Callback5 = ReplaceCallback<5>; // (arg0: string, arg1: string, arg2: string, arg3: string, arg4: string) => string
   */
  type ReplaceCallback<N extends number> = (...args: StringTuple<N>) => string;
}

export {};
