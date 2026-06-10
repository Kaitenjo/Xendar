import { GREATER_THEN, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes an opening tag name after `<`, reading until a space, `/`, or `>` is found.
 * Emits a TAG_OPEN_NAME token with the tag name and transitions to TAG_BODY.
 *
 * @param cursor The lexer cursor positioned at the `<` character.
 * @param _context Unused lexer context.
 * @returns Transition result with the TAG_OPEN_NAME token and the TAG_BODY state.
 */
export function consumeTagOpenName(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let tagName = '';
  let retVal!: LexerTransitionFunctionReturnType

  // Consume '<' character
  cursor.advance();

  /*
    Skip all the spaces between '<' and the actual tag name
    Ex: '<         div>
  */
  cursor.skipSpaces();

  /*
    Keep read input until:
    - Space: <span 
    - GT: <span>
    - Slash (Self Closing tag) <span / or <span/
  */
  while (read) {
    switch (cursor.peek()) {
      case SPACE:
      case SLASH:
      case GREATER_THEN:
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{ 
            type: TokenType.TAG_OPEN_NAME, 
            parts: [tagName] 
          }]
        }
        read = false;
        break;

      default:
        cursor.advance();
        tagName = `${tagName}${cursor.currentChar.value}`
    }
  }

  return retVal
}