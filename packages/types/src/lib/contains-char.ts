/**
 * Recursively checks whether a string literal type contains a specific
 * single-character substring.
 *
 * Resolves to `true` if `Contains` is found anywhere in `String`,
 * or `false` if it is absent.
 *
 * @template String - The string literal type to inspect.
 * @template Contains - The single character to search for.
 *
 * @example
 * type HasMinus = ContainsChar<'-1', '-'>; // true
 * type HasDot = ContainsChar<'42', '.'>; // false
 */
export type ContainsChar<
  String extends string,
  Contains extends string
> =
  String extends `${infer First}${infer Rest}`
    ? First extends Contains
      ? true
      : ContainsChar<Rest, Contains>
    : false;
