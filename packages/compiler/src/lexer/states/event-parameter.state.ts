import { COMMA, DOUBLE_QUOTE, LEFT_BRACE, LEFT_BRACKET, LPAREN, RPAREN, SINGLE_QUOTE } from '../../costants/chars.constants';
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
  let charDelimiter: '"' | "'" | '[' | '{' | '' = '';

  const retVal: LexerTransitionFunctionReturnType = {
    state: LexerState.TAG_BODY,
    tokens: []
  }

  /*
    Consume 
    - '(' If is the first parameter
    - ',' If is the n-th parameter 
  */
  cursor.advance();
  cursor.skipSpaces();

  while (read) {
    switch (cursor.peek()) {
      case LEFT_BRACKET:
      case LEFT_BRACE:
      case DOUBLE_QUOTE:
      case SINGLE_QUOTE:
      case LPAREN:
        eventParameter = addCharacter(cursor, eventParameter);
        // Safe assumption
        if (!charDelimiter) {
          charDelimiter = cursor.currentChar.value as typeof charDelimiter;
        } else if (charDelimiter === cursor.currentChar.value) {
          charDelimiter = '';
        }
        break;

      case COMMA:
        if (!charDelimiter) {
          retVal.tokens!.push({
            type: TokenType.EVENT_PAREMETER,
            parts: [eventParameter]
          });
          cursor.advance();
          eventParameter = '';
        } else {
          eventParameter = addCharacter(cursor, eventParameter);
        }
        break;

      case RPAREN:
        cursor.advance();
        read = false;

      default:
        eventParameter = addCharacter(cursor, eventParameter);
    }
  }

  return retVal;
}

function addCharacter(cursor: LexerCursor, eventParameter: string): string {
  cursor.advance();
  return `${eventParameter}${cursor.currentChar.value}`;
}