import { DOUBLE_QUOTE, EQUAL_THEN, LEFT_BRACE } from '../../costants/chars.constants';
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
  let readAttributeName = true;
  let readValue = false;
  let attribute = '';
  let retVal!: LexerTransitionFunctionReturnType;

  while (readAttributeName) {
    switch (cursor.peek()) {
      case EQUAL_THEN:
        cursor.advance();
        attribute = `${attribute}=`;
        readAttributeName = false;
        break;

      default:
        cursor.advance();
        attribute = `${attribute}${cursor.currentChar.value}`;
    }
  }

  if (cursor.peek() !== DOUBLE_QUOTE) {
    throw new Error(`[Lexer] Expected '"' after attribute name, found '${cursor.currentChar.value}'`);
  }

  // consume opening quote
  cursor.advance();

  while (readValue) {
    switch (cursor.peek()) {
      case DOUBLE_QUOTE:
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{
            type: TokenType.ATTRIBUTE,
            parts: [attribute]
          }] 
        };
        readValue = false;
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