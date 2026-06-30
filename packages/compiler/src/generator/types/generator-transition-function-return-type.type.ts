import { ASTNode } from "../../parser/types/ast.type"
import { InterpolationNode } from "../../parser/types/nodes/interpolation-node.type"
import { TextNode } from "../../parser/types/nodes/text-node.type"
import { CompilerContext } from "../models/compiler-context.model"

export type GeneratorTransitionFunctionReturnType = {
  code: string[],
  functionsToProcess?: Map<string, {
    fn: { node: Exclude<ASTNode, TextNode | InterpolationNode>, parentNode: string, context: CompilerContext },
    args?: string[]
  }>
}