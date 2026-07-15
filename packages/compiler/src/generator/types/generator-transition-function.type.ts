import { ASTNode } from '../../parser/types/ast.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from './generator-transition-function-return-type.type';

/**
 * The signature of a generator transition function.
 *
 * Each function receives the current AST node, an identifier for the generated
 * output segment, the parent node descriptor, the active compiler context, and
 * the name of the `anchor` variable available in the current scope (or `null`
 * if no anchor is available, meaning direct rendering calls should append
 * normally instead of inserting relative to a reserved position).
 *
 * @param node - The AST node currently being processed.
 * @param identifier - A stable identifier for the generated output segment.
 * @param parentNode - The identifier of the parent node in the generation flow.
 * @param compilerContext - The current compiler context node.
 * @param anchor - The name of the anchor variable to forward to direct
 *   rendering calls emitted for this node, or `null` if none is available
 *   in the current scope.
 * @returns The generated output fragments for the provided node.
 */
export type GeneratorTransitionFunction<T extends ASTNode = ASTNode> = (
  node: T,
  identifier: string,
  parentNode: string,
  compilerContext: CompilerContext,
  anchor: string | null
) => GeneratorTransitionFunctionReturnType | undefined