/**
 * A strongly-typed key/value map where every value is optional.
 *
 * Useful as a looser alternative to `Record<K, V>` when not all keys
 * are guaranteed to be present.
 *
 * @template Key - The allowed key type. Must be a string or number.
 * @template Value - The type of each value. Defaults to `string`.
 *
 * @example
 * const headers: Dictionary<string, string> = { 'Content-Type': 'application/json' };
 */
export type Dictionary<Key extends string | number, Value = string> = {
  [K in Key]?: Value
}