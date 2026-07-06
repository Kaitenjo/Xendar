/**
 * A function type that can accept any number of arguments and return any type.
 */
export type Function<
  Arguments extends any[] = any[],
  ReturnType = void
> = Arguments extends Array<any>
  ? (...args: Arguments) => ReturnType
  : () => ReturnType;