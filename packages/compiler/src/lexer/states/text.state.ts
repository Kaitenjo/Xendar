import { AT_SIGN, CR, LEFT_BRACE, LESS_THAN, LF, RIGHT_BRACE, SLASH } from "../../costants/chars.constants.js";
import { isNotBlank } from "../../utils/chars.utils.js";
import { LexerCursor } from "../types/lexer-cursor.model.js";
import { LexerState } from "../types/lexer-state.enum.js";
import { TokenType } from "../types/token-type.enum.js";
import { LexerTransitionFunctionContext } from "../types/transition-function/transition-function-context.type.js";
import { LexerTransitionFunctionReturnType } from "../types/transition-function/transition-function-return-type.type.js";

/**
 * Consumes plain text content, accumulating characters until a structural boundary
 * is reached: `<` (tag open/close), `{` (interpolation), `@` (flow-control or event),
 * or `}` (block close). Emits a TEXT token if non-blank text was accumulated.
 *
 * @param cursor - The lexer cursor positioned at the start of text content.
 * @param context - The lexer context used to detect flow-control block boundaries.
 * @returns Transition result with an optional TEXT token and the next state.
 */
export function consumeText(cursor: LexerCursor, context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let text = '';
  let retVal!: LexerTransitionFunctionReturnType

  while (read) {
    switch (cursor.peek()) {
      case LESS_THAN:
        // If after '<' we read a '/', we suppose we're approaching a ClosureTag, otherwise an OpenTag
        const nextState = cursor.peek(1, { offset: 1 }) === SLASH ? LexerState.TAG_CLOSE : LexerState.TAG_OPEN_NAME;
        retVal = { state: nextState }
        read = false;
        break;

      case LEFT_BRACE:
        retVal = { 
          state: LexerState.INTERPOLATION,
          pushState: true
        };
        read = false;
        break;
      
      case AT_SIGN:
        retVal = {
          state: LexerState.FLOW_CONTROL,
        }
        read = false;
        break;

      case RIGHT_BRACE:
        if (context.history[context.history.length - 1] === LexerState.FLOW_CONTROL_BLOCK) {
          cursor.advance();
          retVal = { 
            state: LexerState.TEXT,
            tokens: [{ type: TokenType.BLOCK_CLOSE }],
            popState: true 
          };
          read = false;
        } else {
          cursor.advance();
          text = `${text}${cursor.currentChar.value}`;
        }
        break;

      case LF:
      case CR:
        cursor.advance();
        break;

      default:
        cursor.advance();
        text = `${text}${cursor.currentChar.value}`;
    }
  }


  /*
    If the first read character trigger a StateChange
    The cumulative `text` variable will be empty

    In this case we must NOT add any token

    Ex:
    Template starts with a tag:
      `<div ...`
    Or an interpolation:
      `{ myVariable }`
  */
  retVal.tokens ??= (isNotBlank(text)
    ? [{ type: TokenType.TEXT, parts: [text] }]
    : undefined);

  return retVal
}