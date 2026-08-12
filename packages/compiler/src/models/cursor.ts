/**
 * Abstract base class for tracking position within a text input.
 *
 * Keeps only the absolute offset (`pos`) of tokens/nodes during processing
 * (lexer, parser, etc.) and computes line/column only on demand, typically
 * for formatting error messages or diagnostics.
 */
export class Cursor {
  /**
   * @param input - The full source text to operate on.
   */
  constructor(protected readonly input: string) { }

  /**
   * Converts an absolute character offset in the text into a human-readable
   * line/column position.
   *
   * Uses binary search over the array of line-start offsets to quickly find
   * the line containing the given offset, then derives the column as the
   * difference between the offset and the start of that line.
   *
   * @param pos - Absolute (0-based) character offset in the original text.
   * @returns A formatted string in the form `[Ln <line>, Col <column>]`
   *          (line and column are 0-based).
   *
   * @example
   * ```typescript
   * cursor.getPositionFromCharacterIndex(15); // "[Ln 2, Col 3]"
   * ```
   */
  public getPositionFromCharacterIndex(pos: number): string {
    const lineStarts = this.getLineStarts();
    let low = 0;
    let high = lineStarts.length - 1;

    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lineStarts[mid] <= pos) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    const row = low;
    const column = pos - lineStarts[row];
    return `[Ln ${row + 1}, Col ${column + 1}]`;
  }

  /**
   * Computes the offset (into `input`) at which each line begins.
   *
   * The result always starts with `0` (the first line always begins at
   * offset 0), followed by the offset immediately after every `\n`
   * encountered in the text.
   *
   * @returns An array of absolute offsets, one per line, in ascending order.
   */
  private getLineStarts(): number[] {
    const result = [0];
    const input = this.input;

    for (let i = 0; i < input.length; i++) {
      if (input[i] === '\n') {
        result.push(i + 1);
      }
    }

    return result;
  }
}