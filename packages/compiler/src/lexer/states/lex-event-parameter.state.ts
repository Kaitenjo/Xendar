import { COMMA, DOUBLE_QUOTE, LEFT_BRACE, LEFT_BRACKET, LPAREN, RIGHT_BRACE, RIGHT_BRACKET, RPAREN, SINGLE_QUOTE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes an event parameter and reads until a ',' or ')'.
 * Emits an EVENT_ATTRIBUTE token containing the raw parameter string.
 *
 * @param cursor - The lexer cursor positioned on the `@` character.
 * @param _context - Unused lexer context.
 * @returns Transition result with the EVENT_PARAMETER token and the EVENT state.
 */
export function lexEventParameter(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let eventParameter = '';
  let charDelimiter: '"' | "'" | '[' | '{' |'' = '';
  let parameterStart = cursor.currentChar.index + 1;

  const retVal: LexerTransitionFunctionReturnType = {
    state: LexerState.TAG_BODY,
    tokens: []
  }

  while (read) {
    switch (cursor.peek()) {
      case LEFT_BRACKET:
      case RIGHT_BRACKET:
      case LEFT_BRACE:
      case RIGHT_BRACE:
      case DOUBLE_QUOTE:
      case SINGLE_QUOTE:
      case LPAREN:
        eventParameter = addCharacter(cursor, eventParameter);
        if (!charDelimiter) {
          // Safe assumption
          charDelimiter = cursor.currentChar.value as typeof charDelimiter;
        } else if (charDelimiter === cursor.currentChar.value || (charDelimiter === '[' && cursor.currentChar.value === ']') || charDelimiter === '{' && cursor.currentChar.value === '}') {
          charDelimiter = '';
        }
        break;

      case COMMA:
        if (!charDelimiter) {
          const parameterEnd = cursor.currentChar.index + 1;
          retVal.tokens!.push({
            type: TokenType.EVENT_PARAMETER,
            parts: [eventParameter],
            span: {
              start: parameterStart,
              end: parameterEnd
            }
          });
          cursor.advance();
          cursor.skipSpaces();
          eventParameter = '';
          parameterStart = cursor.currentChar.index + 1;
        } else {
          eventParameter = addCharacter(cursor, eventParameter);
        }
        break;

      case RPAREN:
        cursor.advance();
        
        if (cursor.peek() !== DOUBLE_QUOTE) {
          throw new Error('Event must be included in Double Quotes')
        }

        // Consume '"'
        cursor.advance();

        if (!charDelimiter) {
          const parameterEnd = cursor.currentChar.index + 1;
          retVal.tokens!.push({
            type: TokenType.EVENT_PARAMETER,
            parts: [eventParameter],
            span: {
              start: parameterStart,
              end: parameterEnd
            }
          });
          read = false;
          break;
        }

        eventParameter = `${eventParameter}${cursor.currentChar.value}`;
        break;

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