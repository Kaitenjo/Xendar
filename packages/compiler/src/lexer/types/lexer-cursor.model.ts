import { PositiveInteger, TupleOfLength } from '@xaendar/types';
import { CR, EOF, LF, SPACE } from '../../costants/chars.constants';
import { CurrentChar } from './current-char.type';
import { CursorPosition } from './current-position.type';

/**
 * Cursor abstraction used by the Lexer to navigate the input source.
 *
 * The LexerCursor is responsible for:
 * - Sequential character consumption
 * - Lookahead (peek) operations without state mutation
 * - Tracking logical position (row, column)
 * - Handling end-of-file conditions
 *
 * This class deliberately contains **no lexer logic**:
 * it does not know about tokens, states, or grammar rules.
 * Its sole responsibility is controlled navigation of the input stream.
 */
export class LexerCursor {
  /**
   * Representation of the current character.
   *
   * - `index`: absolute index within the input string
   * - `code`: Unicode code point of the character
   * - `value`: actual character value
   *
   * An index of `-1` indicates that the cursor has not yet consumed
   * any character or has reached EOF.
   */
  private readonly _currentChar: CurrentChar = {
    code: 0,
    index: -1,
    value: ''
  };
  /**
   * Returns a read-only snapshot of the current character.
   */
  public get currentChar(): Readonly<CurrentChar> {
    return this._currentChar;
  }
  /**
   * Cache used by peek operations to avoid re-reading
   * the same character positions multiple times.
   *
   * Key: absolute character index
   * Value: Unicode code point
   */
  private readonly _peekCache = new Map<number, number>();
  /**
   * Logical position of the cursor in the input.
   *
   * - `row`: zero-based line number
   * - `column`: zero-based column number
   */
  private readonly _position: CursorPosition = {
    row: 0,
    column: 0
  };
  /**
   * Returns a read-only snapshot of the current cursor position.
   */
  public get position(): Readonly<CursorPosition> {
    return this._position;
  }

  public get formattedPosition(): string {
    return `[Ln ${this._position.row}, Col ${this._position.column}]`
  }

  /**
   * Creates a new cursor for the given input source.
   *
   * @param input - Full source string to be tokenised.
   */
  constructor(public input: string) { }

  /**
   * Advances the cursor by the specified number of characters.
   *
   * This method:
   * - Updates the current character
   * - Updates row/column position
   * - Detects line breaks (LF / CR)
   * - Throws an EOF error when the end of the input is reached
   *
   * @param chars - Number of characters to consume. Must be >= 1.
   * @throws When `chars` is less than 1 or when advancing past the end of the input.
   */
  public advance(chars = 1): void {
    if (chars < 1) {
      throw new Error(`${chars} is not a valid value. Please enter a number equal or greater than 1`);
    }

    const newIndex = this._currentChar.index + chars;

    if (newIndex >= this.input.length) {
      this._currentChar.code = EOF;
      this._currentChar.index = -1;
      this._currentChar.value = '';
      this.throwEOFError();
    } else {
      /*
        Before updating the character, adjust logical position.
        Line breaks reset column and increment row.
      */
      if ([LF, CR].includes(this._currentChar.code)) {
        this._position.row++;
        this._position.column = 0;
      } else {
        this._position.column++;
      }

      this._currentChar.index = newIndex;
      this._currentChar.value = this.input[newIndex]!;
      this._currentChar.code = this.input.charCodeAt(newIndex);
    }
  }

  /**
   * Checks whether the upcoming characters in the input match the given pattern,
   * without advancing the cursor.
   *
   * - `string`: fast path using char code comparison (no allocation)
   * - `RegExp`: slices the input and tests the pattern against it.
   *   Requires `length` to know how many characters to peek.
   *
   * @param pattern - String or RegExp to match against.
   * @param length - Number of characters to peek — required when `pattern` is a RegExp.
   * @returns `true` if the upcoming characters match, `false` otherwise.
   */
  public peekMatch(pattern: string): boolean;
  public peekMatch(pattern: RegExp, length: number): boolean;
  public peekMatch(pattern: string | RegExp, length?: number): boolean {
    if (typeof pattern === 'string') {
      const peekedChars = this.peek(pattern.length);

      for (let i = 0; i < pattern.length; i++) {
        if (peekedChars[i] !== pattern.charCodeAt(i)) {
          return false;
        }
      }

      return true;
    }

    // RegExp path — slice input and test
    const start = this._currentChar.index + 1;
    const slice = this.input.slice(start, start + length!);
    return pattern.test(slice);
  }

  /**
   * Peeks ahead in the input stream without advancing the cursor.
   *
   * This method supports:
   * - Single-character lookahead
   * - Multi-character lookahead
   * - Optional offset from the current position
   *
   * Peek operations are cached for performance reasons and do not
   * modify the cursor state.
   *
   * @returns
   * - A single Unicode code point when peeking one character
   * - An array of Unicode code points when peeking multiple characters
   *
   * @throws Error with cause `EOF` if the peek exceeds input length
   */
  public peek(): number;
  public peek<OffSet extends number>(options?: { offset?: PositiveInteger<OffSet> }): number;
  public peek(chars: 1): number;
  public peek<OffSet extends number>(chars: 1, options?: { offset?: PositiveInteger<OffSet> }): number; 
  public peek<ReadChars extends number>(chars: PositiveInteger<ReadChars>): TupleOfLength<ReadChars>; 
  public peek<ReadChars extends number, OffSet extends number>(chars: PositiveInteger<ReadChars>, options?: { offset?: PositiveInteger<OffSet> }): TupleOfLength<ReadChars>;
  public peek(charsOrOptions?: number | { offset?: number }, options?: { offset?: number }): number | number[] {
    const cache = this._peekCache;
    const chars = typeof charsOrOptions === 'number' ? charsOrOptions : 1;
    const offset = (typeof charsOrOptions === 'object' ? charsOrOptions : options)?.offset ?? 0;
    return chars === 1 ? this.peekOneChar(this._currentChar.index + offset + 1, cache) : this.peekMany(chars + offset, cache);
  }

  /**
   * Skips all consecutive space characters from the current position.
   */
  public skipSpaces(): void {
    while (this.peek() === SPACE || this.peek() === LF || this.peek() === CR) {
      this.advance();
    }
  }

  /**
   * Peeks multiple characters ahead.
   */
  private peekMany(chars: number, cache: Map<number, number>): number[] {
    const peekedChars = new Array<number>;
    const nextCharIndex = this._currentChar.index + 1;

    for (let i = nextCharIndex; i < nextCharIndex + chars; i++) {
      peekedChars.push(this.peekOneChar(i, cache));
    }

    return peekedChars;
  }

  /**
   * Peeks a single character at the given absolute index.
   */
  private peekOneChar(index: number, cache: Map<number, number>): number {
    if (cache.has(index)) {
      return cache.get(index)!;
    }

    if (index >= this.input.length) {
      this.throwEOFError();
    }

    const charCode = this.input.charCodeAt(index);
    cache.set(index, charCode);
    return charCode;
  }

  /**
   * Throws a standardized EOF error used by the lexer engine
   * to terminate tokenization.
   */
  private throwEOFError(): never {
    throw new Error('', { cause: EOF });
  }
}
