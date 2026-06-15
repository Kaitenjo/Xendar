import { DOUBLE_QUOTE, LEFT_BRACE, RIGHT_BRACE, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes a JavaScript expression interpolation `{ expression }`, tracking nested
 * brace depth. Emits an INTERPOLATION_EXPRESSION token and pops the state stack to
 * return to the previous state (ATTRIBUTE or TEXT).
 *
 * @param cursor The lexer cursor positioned at the first character of the expression.
 * @param context Lexer context used to retrieve the previous state for restoration.
 * @returns Transition result with the INTERPOLATION_EXPRESSION token and restored state.
 */
export function consumeInterpolationExpression(cursor: LexerCursor, context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let interpolation = '';
  let deep = 1
  let retVal!: LexerTransitionFunctionReturnType;

  while (read) {
    switch (cursor.peek()) {
      case LEFT_BRACE:
        deep++;
        interpolation = addCharacter(cursor, interpolation);
        break;

      case RIGHT_BRACE:
        deep--;

        if (deep === 0) {
          cursor.advance();
          interpolation = interpolation.trimEnd();

          /*
            After an interpolation we have to understanad where to transite
            The next state depends from the previous state
          */
          const previousState = context.history.pop();
          let state!: LexerState;

          switch (previousState) {
            case LexerState.ATTRIBUTE:
              if (cursor.peek() !== DOUBLE_QUOTE) {
                const { row, column } = cursor.position;
                throw new Error(`Interpolation must be end with double quotes '"' Found ${String.fromCharCode(cursor.peek())}. \nRow ${row} Col ${column}`);
              }

              // Consume '"'
              cursor.advance();
              state = LexerState.TAG_BODY
              break;

            case LexerState.TEXT:
              state = LexerState.TEXT
          };

          retVal = {
            state,
            tokens: [{
              type: TokenType.INTERPOLATION_EXPRESSION,
              parts: [interpolation]
            }],
            popState: true
          }
          read = false;
        } else {
          interpolation = addCharacter(cursor, interpolation);
        }

        break;

      default:
        interpolation = addCharacter(cursor, interpolation);
    }
  }

  return retVal;
}

/**
 * Advances the cursor by one character and appends it to the accumulator string.
 *
 * @param cursor The lexer cursor to advance.
 * @param interpolation The current accumulated string.
 * @returns The updated string with the new character appended.
 */
function addCharacter(cursor: LexerCursor, interpolation: string): string {
  cursor.advance(1);
  return `${interpolation}${cursor.currentChar.value}`;
}