import { LPAREN, RPAREN } from "../../costants/chars.constants";
import { LexerCursor } from "../types/lexer-cursor.model";
import { LexerTransitionFunctionContext } from "../types/transition-function/transition-function-context.type";

/**
 * Consumes a parenthesised flow-control condition expression from the cursor.
 *
 * Skips leading whitespace, then expects `(` followed by a balanced
 * parenthesised expression. Handles nested parentheses and returns the
 * raw expression string (excluding the outer `(` and `)`).
 *
 * @param cursor - The lexer cursor positioned before the opening `(`.
 * @param context - Unused lexer context (kept for signature consistency).
 * @returns The raw expression string extracted from inside the parentheses.
 * @throws When the next non-space character is not `(`.
 */
export function lexFlowControlCondition(cursor: LexerCursor, context: LexerTransitionFunctionContext): string {
  cursor.skipSpaces();

  if (cursor.peek() !== LPAREN) {
    throw `Expected '(' but got '${String.fromCharCode(cursor.peek())}' at row ${cursor.position.row}, col ${cursor.position.column}`;
  }

  // consume '('
  cursor.advance();

  let expression = '';
  let depth = 1;

  while (depth > 0) {
    const code = cursor.peek();

    switch (code) {
      case LPAREN:
        depth++;
        expression = addCharacter(cursor, expression);
        break;

      case RPAREN:
        depth--;
        if (!depth) {
          cursor.advance();
          break;
        }

        expression = addCharacter(cursor, expression);
        break;

      default:
        expression = addCharacter(cursor, expression);
    }
  }

  return expression;
}

/**
 * Advances the cursor by one character and appends it to the accumulator string.
 *
 * @param cursor - The lexer cursor to advance.
 * @param expression - The current accumulated expression string.
 * @returns The updated string with the newly consumed character appended.
 */
export function addCharacter(cursor: LexerCursor, expression: string): string {
  cursor.advance();
  return `${expression}${cursor.currentChar.value}`;
}