import { LexerState } from '../lexer-state.enum'
import { TokenWithOptionalSpan } from '../token.type'

/**
 * Result returned by a lexer state transition function.
 *
 * Each lexer state is implemented as a pure function that:
 * - consumes characters from the cursor
 * - optionally emits tokens
 * - decides the next lexer state
 * - optionally manipulates the lexer state stack
 */
export type LexerTransitionFunctionReturnType = {
  /**
   * The next state the lexer should transition to.
   *
   * This is always required and represents the logical continuation
   * of the lexing process after the current state has finished consuming input.
   */
  state: LexerState
  /**
   * Tokens produced while consuming input in the current state.
   *
   * This field is optional because some state transitions
   * may only advance the cursor or change state without
   * emitting any tokens.
   */
  tokens?: TokenWithOptionalSpan[]
  /**
   * Whether the lexer should pop the previous state from the state stack
   * after this transition.
   *
   * This is typically used for temporary or nested states
   * such as interpolations, where the lexer needs to return
   * to the state it was in before entering the nested context.
   */
  popState?: boolean
  /**
   * Whether the lexer should push the current state onto the state stack
   * before transitioning to the next state.
   *
   * This is useful when entering a nested or contextual state
   * (e.g. interpolations or embedded expressions) where the lexer
   * must remember where it came from in order to resume correctly.
   */
  pushState?: boolean
}
