import { LexerCursor } from '../lexer-cursor.model';
import { LexerTransitionFunctionContext } from './transition-function-context.type';
import { LexerTransitionFunctionReturnType } from './transition-function-return-type.type';

/**
 * A lexer transition function.
 *
 * A transition function is responsible for:
 * - Reading characters from the input stream via the {@link LexerCursor}
 * - Emitting zero or more tokens
 * - Deciding the next lexer state
 *
 * Transition functions must be **pure with respect to the lexer engine**:
 * they must not mutate the engine state directly, but instead communicate
 * their intent through the returned {@link LexerTransitionFunctionReturnType}.
 *
 * The lexer engine executes transition functions as part of a
 * Pushdown Automaton (PDA), allowing nested states such as interpolations
 * or embedded expressions.
 *
 * @param cursor
 * Cursor used to inspect and consume characters from the input stream.
 * The cursor encapsulates all low-level navigation logic (peek, advance,
 * position tracking, EOF handling).
 *
 * @param context
 * Read-only contextual information provided by the lexer engine,
 * including the current state stack and execution history.
 *
 * @returns
 * An object describing the outcome of the transition:
 * - the next lexer state
 * - any emitted tokens
 * - optional stack operations (push / pop)
 */
export type LexerTransitionFunction = (cursor: LexerCursor, context: LexerTransitionFunctionContext) => LexerTransitionFunctionReturnType;
