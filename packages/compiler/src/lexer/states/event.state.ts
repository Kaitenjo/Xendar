import { GREATER_THEN, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes a DOM event binding starting with `@` and reads until a delimiter
 * (space, `/`, or `>`) is found. Emits an EVENT token containing the raw binding string.
 *
 * @param cursor The lexer cursor positioned on the `@` character.
 * @param _context Unused lexer context.
 * @returns Transition result with the EVENT token and the TAG_BODY state.
 */
export function consumeEvent(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let event = '';
  let retVal!: LexerTransitionFunctionReturnType;

  // Consume '@' character
  cursor.advance();

  while (read) {
    switch (cursor.peek()) {
      case SPACE:
      case SLASH:
      case GREATER_THEN:
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{ 
            type: TokenType.EVENT, 
            parts: [event] 
          }]
        };
        read = false;
        break;

      default:
        cursor.advance();
        event = `${event}${cursor.currentChar.value}`
    }
  }

  return retVal;
}