/**
 * Creates a type from `T` where at least one of the specified `Keys` must
 * be provided, while the remaining keys stay optional.
 *
 * Useful for option bags where a minimum of one field is required to avoid
 * ambiguous or meaningless configurations.
 *
 * @template T - The base object type.
 * @template Keys - The subset of keys of which at least one must be present.
 *   Defaults to all keys of `T`.
 *
 * @example
 * type SearchParams = RequireOne<{ query?: string; id?: number }>;
 * // Valid:   { query: 'foo' }  |  { id: 42 }  |  { query: 'foo', id: 42 }
 * // Invalid: {}  (TypeScript error)
 */
export type RequireOne<T extends Object, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];
