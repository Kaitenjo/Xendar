import { CompilerContext } from '../../generator/models/compiler-context.model';
import { ASTNode } from '../../parser/types/ast.type';

/**
 * Recursively processes a single AST node into type-checkable TypeScript
 * lines, using the appropriate state function for its node type.
 *
 * Passed down to every state function so they can recurse into their own
 * children without needing to defer anything to a second pass — unlike the
 * JS code generator, the type-check shim has no runtime closures to set up,
 * so there is nothing to defer: everything can be produced in a single,
 * synchronous, depth-first walk.
 */
export type ProcessNode = (node: ASTNode, context: CompilerContext, index: string) => string[];