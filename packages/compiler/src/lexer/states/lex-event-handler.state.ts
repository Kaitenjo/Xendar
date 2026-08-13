import { EQUAL_THEN, GREATER_THEN, LPAREN, RPAREN, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes the handler side of a DOM event binding after `=`.
 * Emits an EVENT_HANDLER token and optionally transitions to EVENT_PARAMETER.
 *
 * @param cursor - The lexer cursor positioned after `=`.
 * @param _context - Unused lexer context.
 * @returns Transition result with EVENT_HANDLER token and next state.
 */
export function lexEventHandler(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let handlerName = '';
  let retVal!: LexerTransitionFunctionReturnType;

  while (read) {
    switch (cursor.peek()) {
      case SPACE:
        throw 'No spaces are allowed in event handler name';
        
      case LPAREN:
        if (!handlerName) {
          throw `Event handler cannot be empty`;
        }

        let state = LexerState.EVENT_PARAMETER; 
        // consume '('
        cursor.advance();

        if (cursor.peekMatch(')"')) {
          state = LexerState.TAG_BODY;
          cursor.advance(2);
        }

        retVal = {
          state,
          tokens: [{
            type: TokenType.EVENT_HANDLER,
            parts: [handlerName]
          }]
        };
        read = false;
        break;

      default:
        cursor.advance();
        handlerName = `${handlerName}${cursor.currentChar.value}`;
    }
  }

  return retVal;
}