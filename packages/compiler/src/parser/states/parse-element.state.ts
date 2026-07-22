import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { TagOpenNameToken } from '../../lexer/types/tokens/tag-open-name-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNodeKind } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { AttributeNode } from '../types/nodes/attribute-node.type';
import { ElementNode } from '../types/nodes/element-node.type';
import { EventNode } from '../types/nodes/event-node.type';
import { parseAttribute } from './parse-attribute.state';
import { parseEvent } from './parse-event.state';

/**
 * Parses a TAG_OPEN_NAME token and the subsequent attributes, events, and children
 * into an `ElementNode`. Handles both regular and self-closing tags.
 *
 * @param cursor - Parser cursor positioned at the TAG_OPEN_NAME token.
 * @param parseNode - Parser function for recursive child parsing.
 * @param token - The TAG_OPEN_NAME token containing the tag name.
 * @returns The parsed `ElementNode`.
 */
export function parseElement(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNodeKind | undefined>, token: TagOpenNameToken): ElementNode {
  cursor.advance();
  const tagName = token.parts[0];

  const attributes = new Array<AttributeNode>();
  const events = new Array<EventNode>();

  let read = true;
  while (read) {
    const token = cursor.peek();
    switch (token.type) {
      case TokenType.ATTRIBUTE:
        attributes.push(parseAttribute(cursor, parseNode, token));
        break;

      case TokenType.EVENT:
        events.push(parseEvent(cursor, parseNode, token));
        break;

      default:
        read = false;
    }
  }

  // Consume TAG_OPEN_END if present: <div>
  if (cursor.peek().type === TokenType.TAG_OPEN_END) {
    cursor.advance();
  }

  // Handle self-closing tags: <div />
  if (cursor.peek().type === TokenType.TAG_SELF_CLOSE) {
    cursor.advance();
    return {
      type: ASTNodeType.Element,
      tagName,
      attributes,
      events,
      children: []
    };
  }

  // Parse children recursively until closing tag
  const children = new Array<ASTNodeKind>;
  while (!isTagClose(cursor, tagName)) {
    const child = parseNode();
    if (child) {
      children.push(child);
    }
  }

  // Consume closing tag </div>
  cursor.advance();

  return {
    type: ASTNodeType.Element,
    tagName,
    attributes,
    events,
    children
  };
}

/**
 * Returns `true` if the next token in the stream is a closing tag for the given tag name.
 *
 * @param cursor - Parser cursor to peek from.
 * @param tagName - The expected tag name to match.
 * @returns `true` if the next token is TAG_CLOSE_NAME matching `tagName`.
 */
function isTagClose(cursor: ParserCursor, tagName: string): boolean {
  const nextToken = cursor.peek();
  return nextToken.type === TokenType.TAG_CLOSE_NAME && nextToken.parts[0] === tagName;
}
