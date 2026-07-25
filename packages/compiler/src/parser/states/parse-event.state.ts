import { NoArgsFunction } from '@xaendar/types';
import { Expression } from 'typescript';
import { TokenType } from '../../lexer/types/token-type.enum';
import { EventHandlerToken } from '../../lexer/types/tokens/event-handler-token.type';
import { EventParAmeterToken } from '../../lexer/types/tokens/event-parameter-token.type';
import { EventToken } from '../../lexer/types/tokens/event-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { EventNode } from '../types/nodes/event-node.type';
import { validateExpression } from '../utils/expression-validator';

/**
 * Parses EVENT + EVENT_HANDLER tokens into an `EventNode`.
 *
 * @param cursor - Parser cursor; advanced past the EVENT token.
 * @param _parseNode - Unused parser function (kept for signature consistency).
 * @param token - The EVENT token to parse.
 * @returns The parsed `EventNode`.
 */
export function parseEvent(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, token: EventToken): EventNode {
  const startOffset = token.span.start;
  cursor.advance();
  const name = token.parts[0];
  const handlerToken = cursor.peek<EventHandlerToken>();

  if (handlerToken.type !== TokenType.EVENT_HANDLER) {
    throw new Error(`Invalid event format for ${name}`);
  }

  cursor.advance();

  let endOffset = cursor.getCurrentToken().value.span.end;

  const parameters = new Array<Expression>
  while (cursor.peek().type === TokenType.EVENT_PARAMETER) {
    cursor.advance();
    parameters.push(validateExpression(cursor.getCurrentToken<EventParAmeterToken>().value.parts[0]).node);
    endOffset = cursor.getCurrentToken().value.span.end;
  }

  return {
    type: ASTNodeType.Event,
    name,
    handler: handlerToken.parts[0],
    parameters,
    span: {
      start: startOffset,
      end: endOffset,
    },
  };
}
