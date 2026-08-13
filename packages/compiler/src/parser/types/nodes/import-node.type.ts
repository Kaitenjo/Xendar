import { ASTNodeWithSpan } from '../ast.type';
import { ASTNodeType } from '../node.enum';
import { ImportSpecifier } from './import-specifier.type';

/**
 * AST node representing a `@import` statement.
 * 
 * Imports symbols from external modules to make them available
 * in template expressions.
 */
export type ImportNode = ASTNodeWithSpan<{
  /**
   * Discriminant identifying this node as an import.
   */
  type: ASTNodeType.Import;

  /**
   * Array of import specifiers with optional aliases.
   * Each specifier maps an exported symbol to a local name.
   */
  specifiers: ImportSpecifier[];

  /**
   * Module path where the symbols are imported from.
   */
  path: string;
}>;
