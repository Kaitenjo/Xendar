import { NoArgsFunction } from '@xaendar/types';
import { EventToken } from '../../lexer/types/tokens/event-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { EventNode } from '../types/nodes/event-node.type';

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
  cursor.advance();
  const raw = token.parts[0];
  const [name, value] = raw.split('=');

  if (!name || !value) {
    throw new Error(`[Parser] Invalid event format: ${raw}`);
  }

  return {
    name,
    handler: value.replace(/^[""]|[""]$/g, '')
  };
}
