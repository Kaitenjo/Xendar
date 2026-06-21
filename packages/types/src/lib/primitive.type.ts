/**
 * Union of all JavaScript primitive value types.
 *
 * Includes `null`, `undefined`, `string`, `number`, `boolean`, `symbol`,
 * and `bigint`.
 *
 * @example
 * function isPrimitive(value: unknown): value is Primitive {
 *   return value === null || typeof value !== 'object' && typeof value !== 'function';
 * }
 */
export type Primitive =
	| null
	| undefined
	| string
	| number
	| boolean
	| symbol
	| bigint;