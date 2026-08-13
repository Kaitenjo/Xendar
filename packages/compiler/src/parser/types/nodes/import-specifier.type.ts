/**
 * Represents a single import specifier with optional aliasing.
 */
export type ImportSpecifier = {
  /**
   * The exported symbol name from the source module.
   * For default exports, this is the string `'default'`.
   * For namespace imports, this is the string `'*'`.
   */
  imported: string;
  /**
   * The local alias available in template expressions.
   * If no alias was provided (e.g., `foo` without `as`), this equals `imported`.
   */
  local: string;
};
