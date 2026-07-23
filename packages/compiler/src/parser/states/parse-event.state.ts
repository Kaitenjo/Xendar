import { NoArgsFunction } from '@xaendar/types';
import { Expression } from 'typescript';
import { TokenType } from '../../lexer/types/token-type.enum';
import { EventParemeterToken } from '../../lexer/types/tokens/event-parameter-token.type';
import { EventToken } from '../../lexer/types/tokens/event-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { EventNode } from '../types/nodes/event-node.type';
import { validateExpression } from '../utils/expression-validator';

/**
 * Parses an EVENT token into an `EventNode` by splitting the raw
 * `eventName=handler` string.
 *
 * @param cursor - Parser cursor; advanced past the EVENT token.
 * @param _parseNode - Unused parser function (kept for signature consistency).
 * @param token - The EVENT token to parse.
 * @returns The parsed `EventNode`.
 */
export function parseEvent(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, token: EventToken): EventNode {
  const startOffset = token.span.start;
  cursor.advance();
  const raw = token.parts[0];
  const [name, value] = raw.split('=');

  if (!name || !value) {
    throw new Error(`[Parser] Invalid event format: ${raw}`);
  }

  const parameters = new Array<Expression>
  while (cursor.peek().type === TokenType.EVENT_PAREMETER) {
    cursor.advance();
    parameters.push(validateExpression(cursor.getCurrentToken<EventParemeterToken>().value.parts[0]).node);
  }

  return {
    type: ASTNodeType.Event,
    name,
    handler: value.replace(/^[""]|[""]$/g, ''),
    parameters,
    span: {
      start: startOffset,
      end: cursor.getCurrentToken().value.span.end,
    },
  };
}
