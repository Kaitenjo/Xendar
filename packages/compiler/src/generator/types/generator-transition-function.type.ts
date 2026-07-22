import { ASTNodeKind } from '../../parser/types/ast.type';
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
 * @param parentNode - The identifier of the parent node in the generation flow.
 * @param index - A stable identifier for the generated output segment.
 * @param compilerContext - The current compiler context node.
 * @param anchor - The name of the anchor variable to forward to direct
 *   rendering calls emitted for this node, or `null` if none is available
 *   in the current scope.
 * @returns The generated output fragments for the provided node.
 */
export type GeneratorTransitionFunction<T extends ASTNodeKind = ASTNodeKind> = (
  node: T,
  parentNode: string,
  index: string,
  compilerContext: CompilerContext,
  anchor: string | null
) => GeneratorTransitionFunctionReturnType | undefined