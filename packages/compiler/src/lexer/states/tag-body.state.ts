import { AT_SIGN, GREATER_THEN, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Scans the body of an open tag to determine what comes next:
 * an event binding (`@`), an attribute, the end of the tag (`>` or `/`), or whitespace.
 * Transitions to the appropriate state without emitting any tokens.
 *
 * @param cursor - The lexer cursor positioned inside a tag body.
 * @param _context - Unused lexer context.
 * @returns Transition result with the next state and no tokens.
 */
export function consumeTagBody(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let retVal!: LexerTransitionFunctionReturnType;

  while (read) {
    const nextChar = cursor.peek();

    switch (nextChar) {
      case AT_SIGN:
        retVal = {
          state: LexerState.EVENT
        }
        read = false;
        break;

      case SPACE:
        cursor.skipSpaces();
        break;

      case GREATER_THEN:
      case SLASH:
        retVal = {
          state: LexerState.TAG_OPEN_END
        }
        read = false;
        break;

      default:
        retVal = {
          state: LexerState.ATTRIBUTE
        }
        read = false;
    }
  }

  return retVal
}