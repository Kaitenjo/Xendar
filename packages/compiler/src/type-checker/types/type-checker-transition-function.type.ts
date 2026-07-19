import { CompilerContext } from '../../generator/models/compiler-context.model';
import { ASTNode } from '../../parser/types/ast.type';
import { ProcessNode } from './type-checker-process-node.type';

/**
 * The signature of a type checker transition function.
 *
 * Each function receives the current AST node, an identifier for the generated
 * output segment, the parent node descriptor, the active compiler context, and
 * the name of the `anchor` variable available in the current scope (or `null`
 * if no anchor is available, meaning direct rendering calls should append
 * normally instead of inserting relative to a reserved position).
 *
 * @param node - The AST node currently being processed.
 * @param index - A stable identifier for the generated output segment.
 * @returns The generated output fragments for the provided node.
 */
export type TypeCheckerTransitionFunction<T extends ASTNode = ASTNode> = (
  node: T,
  context: CompilerContext,
  index: string,
  processNode: ProcessNode,
) => string[]