import { GREATER_THEN } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes the closing characters of an open tag: `>` emits TAG_OPEN_END and
 * transitions to TEXT, while `/>` emits TAG_SELF_CLOSE and also transitions to TEXT.
 *
 * @param cursor - The lexer cursor positioned at `>` or `/`.
 * @param context - Unused lexer context.
 * @returns Transition result with TAG_OPEN_END or TAG_SELF_CLOSE and the TEXT state.
 */
export function lexTagOpenEnd(cursor: LexerCursor, context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let retVal!: LexerTransitionFunctionReturnType

  // We arrive in this point by reading '>' or '/' at the end of a Open Tag 
  if (cursor.peek() === GREATER_THEN) {
    cursor.advance();
    retVal = { 
      state: LexerState.TEXT,
      tokens: [{
        type: TokenType.TAG_OPEN_END,
        parts: []
      }] 
    };
  } else {
    cursor.advance();
    const nextChar = cursor.peek();

    if (nextChar === GREATER_THEN) {
      cursor.advance();
      retVal = {
        state: LexerState.TEXT,
        tokens: [{
          type: TokenType.TAG_SELF_CLOSE,
          parts: []
        }]
      };
    } else {
      context.throwError(`Unexpected character '${String.fromCharCode(nextChar)}' after '/': expected '>' to close self-closing tag at ${cursor.formattedPosition}`);
    }
  }

  return retVal
}