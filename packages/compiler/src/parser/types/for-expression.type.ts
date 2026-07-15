import { Expression } from 'typescript';
import { ForImplicitVariables } from './nodes/for-implicit-variables';

/**
 * Represents the parsed result of an `@for` block expression.
 *
 * Contains the loop variable alias, the iterable and track expressions
 * (both as raw source strings and as validated TypeScript AST nodes),
 * any explicit implicit-variable aliases, and any diagnostics collected
 * during parsing.
 */
export type ForExpression = {
  /** 
   * The loop variable alias (e.g. `item` in `@for(item of items)`). 
   */
  itemAlias: string;
  /** 
   * The iterable expression parsed and validated as a JS expression (e.g. `items`). 
   */
  iterableExpression: Expression;
  /** 
   * The raw source string of the iterable (e.g. `"items"`). 
   */
  iterableSource: string;
  /** 
   * The track expression parsed and validated as a JS expression (e.g. `item.id`). 
   */
  trackExpression: Expression;
  /** 
   * The raw source string of the track expression (e.g. `"item.id"`). 
   */
  trackSource: string;
  /** 
   * Map of explicit implicit variable aliases (e.g. `{ i: '$index', l: '$last' }`). 
   */
  implicitAliases: Map<ForImplicitVariables, string>;
}