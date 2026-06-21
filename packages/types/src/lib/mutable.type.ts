/**
 * Removes the `readonly` modifier from every property of an object type,
 * producing a fully mutable version.
 *
 * The inverse of `Readonly<T>`.
 *
 * @template T - The object type whose properties should become mutable.
 *
 * @example
 * type MutablePoint = Mutable<{ readonly x: number; readonly y: number }>;
 * // { x: number; y: number }
 */
export type Mutable<T extends Object> = {
  -readonly [P in keyof T]: T[P];
};