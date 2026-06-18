import { DOUBLE_QUOTE } from "../../costants/chars.constants";
import { LexerCursor } from "../types/lexer-cursor.model";
import { LexerState } from "../types/lexer-state.enum";
import { TokenType } from "../types/token-type.enum";
import { LexerTransitionFunctionContext } from "../types/transition-function/transition-function-context.type";
import { LexerTransitionFunctionReturnType } from "../types/transition-function/transition-function-return-type.type";

export function consumeAttributeValue(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
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
          }]
        }
        break;

      default:
        cursor.advance();
        value = `${value}${cursor.currentChar.value}`;
    }
  }
  
  return retVal;
}