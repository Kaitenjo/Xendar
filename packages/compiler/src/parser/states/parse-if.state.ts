import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { ElseIfToken } from '../../lexer/types/tokens/else-if-token.type';
import { ElseToken } from '../../lexer/types/tokens/else-token.type';
import { IfToken } from '../../lexer/types/tokens/if-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { ElseIfNode } from '../types/nodes/else-if-node.type';
import { ElseNode } from '../types/nodes/else-node.type';
import { IfNode } from '../types/nodes/if-node.type';
import { validateExpression } from '../utils/expression-validator';
import { parseBlockChildren } from './parse-block-children.state';

/**
 * Parses an `@if` directive, consuming the IF token, the CONDITION token,
 * the BLOCK_OPEN token, all consequent children, and an optional `@else` branch.
 *
 * @param cursor - Parser cursor positioned at the IF token.
 * @param context - Parser function for recursive child parsing.
 * @param token - The IF token (consumed for position advancement).
 * @returns The parsed `IfNode`.
 */
export function parseIfControlFlow(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: IfToken): IfNode {
  return parseIfOrElseIf(cursor, parseNode, token);
}

/**
 * Recursively parses `@else if` and `@else` branches following an `@if` or `@else if` block.
 * Dispatches to the appropriate handler based on the token type.
 *
 * @param cursor - Parser cursor positioned at the current alternate branch token.
 * @param parseNode - Factory function for recursive child node parsing.
 * @param token - The `@else if` or `@else` token to process.
 * @returns An `ElseIfNode` or `ElseNode` representing the parsed branch.
 */
function parseElseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: ElseIfToken | ElseToken): ElseIfNode | ElseNode;
function parseElseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: ElseToken): ElseNode;
function parseElseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: ElseIfToken | ElseToken): ElseIfNode | ElseNode {
  switch (token.type) {
    case TokenType.ELSE_IF:
      return parseIfOrElseIf(cursor, parseNode, token);

    case TokenType.ELSE:
      // consume ELSE and BLOCK_OPEN
      cursor.advance(2);

      const elseChildren = parseBlockChildren(cursor, parseNode);

      return {
        type: ASTNodeType.Else,
        children: elseChildren
      };
  }
}

/**
 * Shared logic for parsing an `@if` or `@else if` block.
 * Consumes the condition token, validates the expression, parses the consequent children,
 * and recursively handles any following alternate branch.
 *
 * @param cursor - Parser cursor positioned at the `@if` or `@else if` token.
 * @param parseNode - Factory function for recursive child node parsing.
 * @param token - The `@if` or `@else if` token being processed.
 * @returns An `IfNode` or `ElseIfNode` with its condition, consequent, and optional alternate.
 */
function parseIfOrElseIf(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: IfToken): IfNode;
function parseIfOrElseIf(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: ElseIfToken): ElseIfNode;
function parseIfOrElseIf(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: IfToken | ElseIfToken): IfNode | ElseIfNode {
  cursor.advance();

  const conditionToken = cursor.peek();
  if (conditionToken.type !== TokenType.CONDITION) {
    throw new Error(`[Parser] Expected CONDITION after ${TokenType[token.type]}, got ${TokenType[conditionToken.type]}`);
  }

  // consume CONDITION and BLOCK_OPEN
  cursor.advance(2);

  const condition = conditionToken.parts[0];
  const validationResult = validateExpression(condition);

  const consequent = parseBlockChildren(cursor, parseNode);

  return {
    type: token.type === TokenType.IF ? ASTNodeType.If : ASTNodeType.ElseIf,
    condition,
    conditionNode: validationResult.node,
    children: consequent,
    alternate: parseElseIfRecursively(cursor, parseNode, cursor.peek<ElseIfToken | ElseToken>())
  };
}