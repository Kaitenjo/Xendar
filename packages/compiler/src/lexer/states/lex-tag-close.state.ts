import { GREATER_THEN, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes a closing tag `</tagName>`, skipping the `</` prefix and any surrounding
 * whitespace. Emits a TAG_CLOSE_NAME token with the tag name and transitions to TEXT.
 *
 * @param cursor - The lexer cursor positioned at the `<` of a closing tag.
 * @param _context - Unused lexer context.
 * @returns Transition result with the TAG_CLOSE_NAME token and the TEXT state.
 */
export function lexTagClose(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let tagName = '';
  let retVal!: LexerTransitionFunctionReturnType;

  // Skip '</'
  cursor.advance(2);

  /*
    Skip all the spaces between '</' and the actual tag name
    Ex: '</         div>
  */
  cursor.skipSpaces();

  while (read) {
    switch (cursor.peek()) {
      case GREATER_THEN:
        if (!tagName) {
          throw `Tag close name cannot be empty`;
        }
        cursor.advance();
        retVal = {
          state: LexerState.TEXT,
          tokens: [{
            type: TokenType.TAG_CLOSE_NAME, 
            parts: [tagName]
          }]
        };
        read = false;
        break;

      case SPACE:
        throw `Tag close name cannot contain spaces`;

      default:
        cursor.advance();
        tagName = `${tagName}${cursor.currentChar.value}`;
    }
  }

  return retVal;
}