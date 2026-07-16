import { DOUBLE_QUOTE, GRAVE_ACCENT, RIGHT_BRACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes a template-literal interpolation `` {`...`} ``, collecting characters
 * until the closing backtick followed by `}`. Emits an INTERPOLATION_LITERAL token
 * and pops the state stack to return to the previous state.
 *
 * @param cursor - The lexer cursor positioned at the opening backtick.
 * @param context - The lexer context used to retrieve the previous state for restoration.
 * @returns Transition result with the INTERPOLATION_LITERAL token and restored state.
 */
export function lexInterpolationliteral(cursor: LexerCursor, context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let interpolation = '`';
  let retVal!: LexerTransitionFunctionReturnType;

  // Consume '`' character
  cursor.advance();

  while (read) {
    switch (cursor.peek()) {
      case GRAVE_ACCENT:
        interpolation = addCharacter(cursor, interpolation);

        if (cursor.peek() === RIGHT_BRACE) {
          // Consume '}'
          cursor.advance();
          
          /*
            After an interpolation we have to understanad where to transite
            The next state depends from the previous state
          */
          const previousState = context.history.pop();
          let state!: LexerState;

          switch (previousState) {
            case LexerState.ATTRIBUTE:
              if (cursor.peek() !== DOUBLE_QUOTE) {
                throw new Error(`Attribute interpolation expression must end with double quotes at ${cursor.formattedPosition}`)
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
              type: TokenType.INTERPOLATION_LITERAL,
              parts: [interpolation]
            }],
            popState: true
          }
          read = false;
        } else {
          /*
            If ` is not followed by }, it means the interpolation is not closed
            and ` is part of the interpolated string
                                   |
                                   ˅
            Example: {`text ${var} ` text`}
          */
          interpolation = `${interpolation}${cursor.currentChar.value}`
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
 * @param cursor - The lexer cursor to advance.
 * @param interpolation - The current accumulated expression string.
 * @returns The updated string with the newly consumed character appended.
 */
function addCharacter(cursor: LexerCursor, interpolation: string): string {
  cursor.advance();
  return `${interpolation}${cursor.currentChar.value}`;
}