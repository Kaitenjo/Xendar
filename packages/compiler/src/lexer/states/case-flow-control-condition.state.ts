import { LexerCursor } from "../types/lexer-cursor.model.js";
import { LexerState } from "../types/lexer-state.enum.js";
import { TokenType } from "../types/token-type.enum.js";
import { LexerTransitionFunctionContext } from "../types/transition-function/transition-function-context.type.js";
import { LexerTransitionFunctionReturnType } from "../types/transition-function/transition-function-return-type.type.js";
import { consumeFlowControlCondition } from "../utils/consume-flow-control-condition.utils.js";

/**
 * Consumes the condition expression `(...)` of a flow-control directive,
 * handling nested parentheses correctly. Emits a CONDITION token with the
 * raw expression string and transitions to FLOW_CONTROL_BLOCK.
 *
 * @param cursor - The lexer cursor positioned at the opening `(`.
 * @param _context - Unused lexer context.
 * @returns Transition result with the CONDITION token and the FLOW_CONTROL_BLOCK state.
 */
export function consumeCaseFlowControlCondition(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  const condition = consumeFlowControlCondition(cursor, _context);
  cursor.skipSpaces();

  return {
    state: cursor.peekMatch('@case') ? LexerState.FLOW_CONTROL : LexerState.FLOW_CONTROL_BLOCK,
    tokens: [{
      type: TokenType.CONDITION,
      parts: [condition]
    }],
    popState: true
  };
}
