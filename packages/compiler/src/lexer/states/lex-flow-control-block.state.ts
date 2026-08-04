import { LEFT_BRACE } from "../../costants/chars.constants.js";
import { LexerCursor } from "../types/lexer-cursor.model.js";
import { LexerState } from "../types/lexer-state.enum.js";
import { TokenType } from "../types/token-type.enum.js";
import { LexerTransitionFunctionContext } from "../types/transition-function/transition-function-context.type.js";
import { LexerTransitionFunctionReturnType } from "../types/transition-function/transition-function-return-type.type.js";

/**
 * Consumes the opening `{` of a flow-control block body,
 * skipping any leading whitespace before it.
 *
 * Emits a BLOCK_OPEN token and transitions to TEXT, pushing FLOW_CONTROL_BLOCK
 * onto the state stack so that `consumeText` later recognises the matching `}`
 * as a BLOCK_CLOSE rather than an interpolation boundary.
 *
 * Used by: `@if`, `@for`, `@switch`, `@case`, `@else`, `@default`.
 *
 * @param cursor - The lexer cursor positioned before the opening `{`.
 * @param _context - Unused lexer context.
 * @returns Transition result with the BLOCK_OPEN token and the TEXT state.
 */
export function lexFlowControlBlock(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  cursor.skipSpaces();

  if (cursor.peek() !== LEFT_BRACE) {
    throw `Expected '{' but got '${String.fromCharCode(cursor.peek())}' at ${cursor.formattedPosition}`;
  }

  // consume '{'
  cursor.advance();

  return {
    state: LexerState.TEXT,
    tokens: [{ type: TokenType.BLOCK_OPEN }],
    pushState: true
  };
}
