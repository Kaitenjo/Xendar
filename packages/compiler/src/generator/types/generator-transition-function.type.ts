import { Function } from '@xaendar/types';
import { ASTNode } from '../../parser/types/ast.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from './generator-transition-function-return-type.type';

/**
 * The signature of a generator transition function.
 *
 * Each function receives the current AST node, an identifier for the generated
 * output segment, the parent node descriptor, and the active compiler context.
 * It returns a list of generated output fragments.
 *
 * @param node - The AST node currently being processed.
 * @param identifier - A stable identifier for the generated output segment.
 * @param parentNode - The identifier of the parent node in the generation flow.
 * @param compilerContext - The current compiler context node.
 * @returns The generated output fragments for the provided node.
 */
export type GeneratorTransitionFunction<T extends ASTNode = ASTNode> = (
  node: T, 
  identifier: string, 
  parentNode: string, 
  compilerContext: CompilerContext, 
  processNode: Function<[ASTNode, string, string, CompilerContext, Function], GeneratorTransitionFunctionReturnType> 
) => GeneratorTransitionFunctionReturnType