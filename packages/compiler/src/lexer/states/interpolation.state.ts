import { GRAVE_ACCENT } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Dispatches between an expression and a literal interpolation after the opening `{`.
 * Advances past `{` and any leading spaces, then inspects the next character:
 * a backtick routes to INTERPOLATION_LITERAL, a JS identifier start routes to INTERPOLATION_EXPRESSION.
 *
 * @param cursor - The lexer cursor positioned on the `{` character.
 * @param _context - Unused lexer context.
 * @returns Transition result with the appropriate interpolation sub-state.
 */
export function consumeInterpolation(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  // Consume '{' characters
  cursor.advance();

  /*
    Skip all the spaces between '{' and the actual interpolation content
    Ex: '{         label}
  */
  cursor.skipSpaces();
  
  const nextChar = cursor.peek();

  return nextChar === GRAVE_ACCENT 
    ? { state: LexerState.INTERPOLATION_LITERAL } 
    : { state: LexerState.INTERPOLATION_EXPRESSION };
}