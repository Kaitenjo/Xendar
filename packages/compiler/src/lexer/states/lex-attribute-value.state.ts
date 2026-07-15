import { DOUBLE_QUOTE } from "../../costants/chars.constants";
import { LexerCursor } from "../types/lexer-cursor.model";
import { LexerState } from "../types/lexer-state.enum";
import { TokenType } from "../types/token-type.enum";
import { LexerTransitionFunctionContext } from "../types/transition-function/transition-function-context.type";
import { LexerTransitionFunctionReturnType } from "../types/transition-function/transition-function-return-type.type";

/**
 * Consumes a quoted attribute value `"..."`, collecting characters until
 * the closing `"` is found. Emits an ATTRIBUTE_VALUE token and transitions
 * back to TAG_BODY.
 *
 * @param cursor - The lexer cursor positioned at the first character of the value (after the opening `"`).
 * @param _context - Unused lexer context.
 * @returns Transition result with the ATTRIBUTE_VALUE token and the TAG_BODY state.
 */
export function lexAttributeValue(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let value = '';
  let retVal!: LexerTransitionFunctionReturnType;

  while (read) {
    switch (cursor.peek()) {
      case DOUBLE_QUOTE:
        cursor.advance();
        read = false;
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{
            type: TokenType.ATTRIBUTE_VALUE,
            parts: [value]
          }],
          popState: true
        }
        break;

      default:
        cursor.advance();
        value = `${value}${cursor.currentChar.value}`;
    }
  }
  
  return retVal;
}