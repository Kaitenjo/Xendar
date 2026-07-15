/**
 * Union of the implicit variables automatically available inside an `@for` block.
 *
 * - `$index` — zero-based index of the current item
 * - `$first` — `true` when the current item is the first in the collection
 * - `$last`  — `true` when the current item is the last in the collection
 * - `$even`  — `true` when `$index` is even
 * - `$odd`   — `true` when `$index` is odd
 */
export type ForImplicitVariables =
  | '$index'
  | '$last'
  | '$first'
  | '$even'
  | '$odd';