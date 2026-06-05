import { LEFT_BRACE, RIGHT_BRACE, SPACE } from '../../costants/chars.constants.js';
import { LexerCursor } from '../types/lexer-cursor.model.js';
import { LexerState } from '../types/lexer-state.enum.js';
import { TokenType } from '../types/token-type.enum.js';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type.js';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type.js';

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
              /*
                This is a special case to handle syntax sugar for attribute interpolations:
                If the attribute name and the variable binded have the same indentifier it can be written
                from attribute={attribute} to {attribute}
                
                In this case the attribute token emitted by the previosu state will have an empty string
                as part and we need to fill it with the actual interpolation content

                This is tricky but it allows to avoid unnecessary complication in the parser and
                render generator, by keeping this syntax sugar as a purely lexical feature and
                by redirecting to the standard flow for attribute interpolations after the lexer
              */
              const lastToken = context.tokens[context.tokens.length - 1];
              if (lastToken?.type === TokenType.ATTRIBUTE && !lastToken.parts[0]) {
                lastToken.parts[0] = `${interpolation}=`;
              }
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