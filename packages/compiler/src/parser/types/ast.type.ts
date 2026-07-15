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
