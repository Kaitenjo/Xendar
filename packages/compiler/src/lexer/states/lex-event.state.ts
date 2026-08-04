import { DOUBLE_QUOTE, EQUAL_THEN, GREATER_THEN, LPAREN, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes a DOM event binding starting with `@` and reads until a delimiter
 * or `=` is found. Emits an EVENT token containing only the event name,
 * then transitions to EVENT_HANDLER to parse the handler token.
 *
 * @param cursor - The lexer cursor positioned on the `@` character.
 * @param _context - Unused lexer context.
 * @returns Transition result with the EVENT token and EVENT_HANDLER state.
 */
export function lexEvent(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let eventName = '';
  let retVal!: LexerTransitionFunctionReturnType;

  // Consume '@' character
  cursor.advance();

  while (read) {
    switch (cursor.peek()) {
      case SPACE:
        throw 'No spaces are allowed in event name';

      case EQUAL_THEN:
        if (!eventName) {
          throw 'Event name cannot be empty';
        }

        // Consume '='
        cursor.advance();

        if (cursor.peek() !== DOUBLE_QUOTE) {
          throw 'Event handler must be included in Double Quotes';
        }

        // Consume '"'
        cursor.advance();
        retVal = {
          state: LexerState.EVENT_HANDLER,
          tokens: [{
            type: TokenType.EVENT,
            parts: [eventName]
          }]
        };
        read = false;
        break;

      default:
        cursor.advance();
        eventName = `${eventName}${cursor.currentChar.value}`;
    }
  }

  return retVal;
}