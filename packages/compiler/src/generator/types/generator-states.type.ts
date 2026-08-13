import { ASTNodeType } from '../../parser/types/node.enum'
import { ElementNode } from '../../parser/types/nodes/element-node.type'
import { ForNode } from '../../parser/types/nodes/for-node.type'
import { IfNode } from '../../parser/types/nodes/if-node.type'
import { ImportNode } from '../../parser/types/nodes/import-node.type'
import { InterpolationNode } from '../../parser/types/nodes/interpolation-node.type'
import { SwitchNode } from '../../parser/types/nodes/switch-node.type'
import { TextNode } from '../../parser/types/nodes/text-node.type'
import { GeneratorTransitionFunction } from './generator-transition-function.type'

type OmittedKeys = Exclude<ASTNodeType, 
 | ASTNodeType.Text
 | ASTNodeType.Interpolation
 | ASTNodeType.Element
 | ASTNodeType.If
 | ASTNodeType.For
 | ASTNodeType.Switch
 | ASTNodeType.Import
>

/**
 * Maps each supported AST node type to its generator transition function.
 * 
 * This structure allows the generator to dynamically select the appropriate
 * generation logic based on the current node type.
 * 
 * Each entry binds a concrete AST node type to a transition function that
 * emits the output fragments for that node.
 */
export type GeneratorStates = {
  [ASTNodeType.Text]: GeneratorTransitionFunction<TextNode | InterpolationNode>,
  [ASTNodeType.Interpolation]: GeneratorTransitionFunction<TextNode | InterpolationNode>
  [ASTNodeType.Element]: GeneratorTransitionFunction<ElementNode>,
  [ASTNodeType.If]: GeneratorTransitionFunction<IfNode>,
  [ASTNodeType.For]: GeneratorTransitionFunction<ForNode>,
  [ASTNodeType.Switch]: GeneratorTransitionFunction<SwitchNode>
  [ASTNodeType.Import]: GeneratorTransitionFunction<ImportNode>
} & 
{ 
  [K in OmittedKeys]?: undefined 
}