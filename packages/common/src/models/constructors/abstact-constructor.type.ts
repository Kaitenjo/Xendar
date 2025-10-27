/**
 * A type representing an abstract constructor function for a given type T.
 * This type can be used to define abstract classes.
 */
export type AbstractConstructor<T extends Object = Object> = abstract new (...args: any[]) => T;