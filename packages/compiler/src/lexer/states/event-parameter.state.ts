import { COMMA } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes an event parameter and reads until a ',' or ')'.
 * Emits an EVENT_ATTRIBUTE token containing the raw paremeter string.
 *
 * @param cursor - The lexer cursor positioned on the `@` character.
 * @param _context - Unused lexer context.
 * @returns Transition result with the EVENT_PAREMETER token and the EVENT state.
 */
export function consumeEventParameter(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let eventParameter = '';
  let retVal!: LexerTransitionFunctionReturnType

  /*
    Consume 
    - '(' If is the first parameter
    - ',' If is the n-th parameter 
  */
  cursor.advance();
  cursor.skipSpaces();

  while (read) {
    switch (cursor.peek()) {
      case COMMA:
        retVal = {
          state: LexerState.EVENT,
          tokens: [{
            type: TokenType.EVENT_PAREMETER,
            parts: [eventParameter]
          }]
        }
        read = false;
        break;

      default:
        cursor.advance();
        eventParameter = `${eventParameter}${cursor.currentChar.value}`;
    }
  }

  return retVal;
}
