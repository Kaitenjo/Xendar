/**
 * A type representing a constructor function for a given type T.
 * This type can be used to define classes or factory functions
 */
export type Constructor<T extends Object = Object, Statics extends { [key: string]: any } = { [key: string]: any }> = (new (...args: any[]) => T) & Statics;