/**
 * Flattens the display of an intersection or mapped type so that IDEs show
 * the resolved property list instead of the raw intersection expression.
 *
 * Useful for improving hover information on complex composed types.
 *
 * @template T - The object type to beautify.
 *
 * @example
 * type Merged = Beautify<{ a: string } & { b: number }>;
 * // Hovering shows: { a: string; b: number }
 */
export type Beautify<T extends Object> = {
  [K in keyof T]: T[K] 
} & {}