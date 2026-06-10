import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { IfToken } from '../../lexer/types/tokens/if-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { ElseNode } from '../types/nodes/else-node.type';
import { IfNode } from '../types/nodes/if-node.type';
import { validateExpression } from '../utils/expression-validator';
import { parseBlockChildren } from './parse-block-children.state';
import { ElseIfToken } from '../../lexer/types/tokens/else-if-token.type';
import { ElseIfNode } from '../types/nodes/else-if-node.type';
import { ElseToken } from '../../lexer/types/tokens/else-token.type';

/**
 * Parses an `@if` directive, consuming the IF token, the CONDITION token,
 * the BLOCK_OPEN token, all consequent children, and an optional `@else` branch.
 *
 * @param cursor Parser cursor positioned at the IF token.
 * @param context Parser context for recursive child parsing.
 * @param token The IF token (unused; consumed for position advancement).
 * @returns The parsed `IfNode`.
 */
export function parseIfControlFlow(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: IfToken): IfNode {
  return parseIfRecursively(cursor, parseNode, token);
}

function parseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: IfToken): IfNode;
function parseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: ElseIfToken | ElseToken): ElseIfNode | ElseNode;
function parseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: ElseToken): ElseNode;
function parseIfRecursively(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: IfToken | ElseIfToken | ElseToken): IfNode | ElseIfNode | ElseNode {
  switch (token.type) {
    case TokenType.IF:
    case TokenType.ELSE_IF:
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
        consequent,
        alternate: parseIfRecursively(cursor, parseNode, cursor.peek<ElseIfToken | ElseToken>())
      };

    case TokenType.ELSE:
      // consume ELSE and BLOCK_OPEN
      cursor.advance(2);

      const elseChildren = parseBlockChildren(cursor, parseNode);
      
      return {
        type: ASTNodeType.Else,
        consequent: elseChildren
      };
  }
}