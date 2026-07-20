/**
 * Import type for directive declarations in type-checker context.
 * Stores metadata extracted from directive decorated classes.
 */
export type TypeCheckContextDirectiveImport = {
  /**
   * The import type identifier.
   */
  type: 'directive';

  /**
   * Directive class name.
   */
  className: string;
};
