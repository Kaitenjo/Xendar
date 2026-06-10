import { GREATER_THEN, LEFT_BRACE, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes an attribute name and optional value from the current position,
 * transitioning back to TAG_BODY when a space, `/`, or `>` is encountered.
 * If the attribute value is an interpolation, pushes the INTERPOLATION state.
 *
 * @param cursor The lexer cursor positioned at the start of the attribute.
 * @param _context Unused lexer context.
 * @returns Transition result with the ATTRIBUTE token and next state.
 */
export function consumeAttribute(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let attribute = '';
  let retVal!: LexerTransitionFunctionReturnType;

  while (read) {
    switch (cursor.peek()) {
      case SPACE:
      case SLASH:
      case GREATER_THEN:
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{
            type: TokenType.ATTRIBUTE,
            parts: [attribute]
          }] 
        };
        read = false;
        break;

      case LEFT_BRACE:
        retVal = {
          state: LexerState.INTERPOLATION,
          tokens: [{
            type: TokenType.ATTRIBUTE,
            parts: [attribute]
          }],
          pushState: true 
        };
        read = false;
        break;

      default:
        cursor.advance();
        attribute = `${attribute}${cursor.currentChar.value}`
    }
  }

  return retVal;
}