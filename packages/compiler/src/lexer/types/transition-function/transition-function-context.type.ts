import { LexerState } from '../lexer-state.enum'
import { Token } from '../token.type'

/**
 * Context object passed by the Lexer engine to each
 * lexer transition function.
 *
 * This context exposes read-only information about the
 * internal execution state of the lexer, without allowing
 * direct mutation of the engine.
 */
export type LexerTransitionFunctionContext = {
  /**
   * Read-only view of the lexer state stack.
   *
   * The stack represents the execution history of the lexer
   * and is used to support nested or temporary states
   * (e.g. interpolations, embedded expressions, attribute values).
   *
   * Conceptually, the lexer behaves as a Pushdown Automaton (PDA),
   * where this stack allows the engine to return to a previous
   * state after completing a nested transition.
   *
   * The array is ordered from bottom (oldest state)
   * to top (most recent state).
   */
  history: LexerState[],
  /**
   * Read-only snapshot of all tokens emitted by the lexer up to this point.
   *
   * This allows transition functions to make decisions based on previously
   * emitted tokens, enabling context-sensitive lexing behavior.
   * 
   * Note that this is a snapshot and should not be mutated by transition functions.
   */
  tokens: Token[]
}
