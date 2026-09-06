import { TypeCheckerCache } from "./type-checker/types/typechecker-cache.type";

/**
 * Configuration options for the compile function.
 *
 * Allows customizing the compilation behavior of Xaendar DSL templates
 * through optional caching, CSS variable injection, and signal extraction.
 *
 * @example
 * // Compile with type-checking only
 * const typeCheckResult = await compile(templateSource, {
 *   baseDir: '/path/to/templates'
 * });
 *
 * @example
 * // Compile with JavaScript generation and signals
 * const javascript = await compile(templateSource, {
 *   cssVariableName: '__MyComponent_sheet',
 *   signals: ['count', 'isActive']
 * });
 *
 * @example
 * // Compile with caching
 * const metadataCache = new Map();
 * const result = await compile(templateSource, {
 *   baseDir: '/path/to/templates',
 *   cssVariableName: '__MyComponent_sheet',
 *   signals: ['count'],
 *   cache: {
 *     get: (key) => metadataCache.get(key),
 *     set: (key, value) => metadataCache.set(key, value)
 *   }
 * });
 */
export type CompileOptions = {
  /**
   * Base directory for resolving component imports and template paths.
   *
   * Required when performing type-checking compilation. Used to resolve
   * relative import paths to absolute file paths.
   */
  baseDir?: string;
  /**
   * CSS variable name for storing adopted stylesheets.
   *
   * When provided, the generated code will include an assignment to this
   * variable containing the adopted stylesheet for the component.
   * Example: `__MyComponent_sheet` will generate `const __MyComponent_sheet = ...`
   *
   * Required when generating JavaScript output. Ignored if undefined.
   */
  cssVariableName?: string | undefined;
  /**
   * Array of signal member names extracted from the component class.
   *
   * Used during code generation to properly inject reactive signal bindings
   * and updates into the generated render function.
   *
   * Required when generating JavaScript output. Ignored if undefined.
   */
  signals?: string[];

  /**
   * Optional caching layer for component and directive metadata.
   *
   * Improves compilation performance by caching extracted metadata,
   * avoiding redundant parsing and extraction of imported components.
   */
  cache?: TypeCheckerCache
}
