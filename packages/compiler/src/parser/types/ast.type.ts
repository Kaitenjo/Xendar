import { Span } from '../../types/span.type';
import { ASTNodeType } from './node.enum';
import { CaseNode } from './nodes/case-node.type';
import { ElementNode } from './nodes/element-node.type';
import { ElseIfNode } from './nodes/else-if-node.type';
import { ElseNode } from './nodes/else-node.type';
import { ForNode } from './nodes/for-node.type';
import { IfNode } from './nodes/if-node.type';
import { ImportNode } from './nodes/import-node.type';
import { InterpolationNode } from './nodes/interpolation-node.type';
import { SwitchNode } from './nodes/switch-node.type';
import { TextNode } from './nodes/text-node.type';

/**
 * Union of all AST node types that the parser can produce from a token stream.
 */
export type ASTNode =
  | ElementNode
  | TextNode
  | InterpolationNode
  | IfNode
  | ElseIfNode
  | ElseNode
  | ForNode
  | SwitchNode
  | CaseNode
  | ImportNode;

export type ASTNodeWithOptionalSpan =
| MaybeASTNodeWithSpan<ElementNode>
| MaybeASTNodeWithSpan<TextNode>
| MaybeASTNodeWithSpan<InterpolationNode>
| MaybeASTNodeWithSpan<IfNode>
| MaybeASTNodeWithSpan<ElseIfNode>
| MaybeASTNodeWithSpan<ElseNode>
| MaybeASTNodeWithSpan<ForNode>
| MaybeASTNodeWithSpan<SwitchNode>
| MaybeASTNodeWithSpan<CaseNode>
| MaybeASTNodeWithSpan<ImportNode>;

export type ASTNodeWithSpan<T extends { type: ASTNodeType }> = T & {
  span: Span
} 

export type MaybeASTNodeWithSpan<T extends { type: ASTNodeType, span: Span }> = Omit<T, 'span'> & Partial<Pick<T, 'span'>>;