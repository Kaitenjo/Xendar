import { slice, Stack } from '@xaendar/common';
import { Dictionary } from '@xaendar/types';
import { CR, EOF, LF, SPACE } from '../costants/chars.constants';
import { Span } from '../types/span.type';
import { lexAttributeValue } from './states/lex-attribute-value.state';
import { lexAttribute } from './states/lex-attribute.state';
import { lexCaseFlowControlCondition } from './states/lex-case-flow-control-condition.state';
import { lexDefaultFlowControlCondition } from './states/lex-default-flow-control-condition.state';
import { lexEventHandler } from './states/lex-event-handler.state';
import { lexEventParameter } from './states/lex-event-parameter.state';
import { lexEvent } from './states/lex-event.state';
import { lexFlowControl } from './states/lex-flow-control';
import { lexFlowControlBlock } from './states/lex-flow-control-block.state';
import { lexImportPath } from './states/lex-import-path.state';
import { lexImport } from './states/lex-import.state';
import { lexInterpolationExpression } from './states/lex-interpolation-expression.state';
import { lexInterpolationliteral } from './states/lex-interpolation-literal.state';
import { lexInterpolation } from './states/lex-interpolation.state';
import { lexTagBody } from './states/lex-tag-body.state';
import { lexTagClose } from './states/lex-tag-close.state';
import { lexTagOpenEnd } from './states/lex-tag-open-end.state';
import { lexTagOpenName } from './states/lex-tag-open-name.state';
import { lexText } from './states/lex-text.state';
import { LexerCursor } from './types/lexer-cursor.model';
import { LexerState } from './types/lexer-state.enum';
import { Token, TokenWithOptionalSpan } from './types/token.type';
import { LexerTransitionFunction } from './types/transition-function/transition-function.type';

/**
 * Utility class that emulates a cursor navigating through a template string.
 *
 * The cursor keeps track of the current character, its absolute position
 * within the text, and its logical position expressed as row and column.
 * This is useful when parsing or analyzing template content character by character.
 */
export class Lexer {
  /**
   * Cursor for navigating the input character stream.
   */
  private readonly _cursor: LexerCursor;
  /**
   * Current lexer state.
   */
  private _state = LexerState.TEXT;
  /**
   * State stack used to support nested states (e.g. interpolations).
   */
  private _stack = new Stack<LexerState>;
  /**
   * Accumulated list of tokens emitted during tokenization.
   */
  private readonly _tokens = new Array<Token>;
  /**
   * Maps each lexer state to its corresponding transition function.
   */
  private readonly _states: Dictionary<LexerState, LexerTransitionFunction> = {
    [LexerState.TEXT]: lexText,
    [LexerState.TAG_OPEN_NAME]: lexTagOpenName,
    [LexerState.TAG_BODY]: lexTagBody,
    [LexerState.TAG_OPEN_END]: lexTagOpenEnd,
    [LexerState.TAG_CLOSE]: lexTagClose,
    [LexerState.ATTRIBUTE]: lexAttribute,
    [LexerState.ATTRIBUTE_VALUE]: lexAttributeValue,
    [LexerState.EVENT]: lexEvent,
    [LexerState.EVENT_HANDLER]: lexEventHandler,
    [LexerState.EVENT_PARAMETER]: lexEventParameter,
    [LexerState.FLOW_CONTROL]: lexFlowControl,
    [LexerState.FLOW_CONTROL_CONDITION]: lexDefaultFlowControlCondition,
    [LexerState.CASE_FLOW_CONTROL_CONDITION]: lexCaseFlowControlCondition,
    [LexerState.FLOW_CONTROL_BLOCK]: lexFlowControlBlock,
    [LexerState.INTERPOLATION]: lexInterpolation,
    [LexerState.INTERPOLATION_EXPRESSION]: lexInterpolationExpression,
    [LexerState.INTERPOLATION_LITERAL]: lexInterpolationliteral,
    [LexerState.IMPORT]: lexImport,
    [LexerState.IMPORT_PATH]: lexImportPath
  }

  /**
   * Creates a new Lexer instance for the given template content.
   *
   * @param _input - The full template text to tokenise.
   */
  constructor(private _input: string) {
    this._cursor = new LexerCursor(this._input);
  }

  /**
   * Runs the lexer over the input string and returns the full token array.
   * Drives the state machine until EOF is reached.
   *
   * @returns Array of all tokens produced from the input.
   */
  public tokenize(): Token[] {
    let eof = false;
    const cursor = this._cursor;
    let stateStartIndex = -1;

    while (!eof) {
      try {
        stateStartIndex = cursor.currentChar.index + 1;
        const transitionFunction = this._states[this._state];
        const { state, tokens, popState, pushState } = transitionFunction!(cursor, {
          history: this._stack.values,
          tokens: [...this._tokens],
        });

        if (tokens?.length) {
          const stateEndIndex = cursor.currentChar.index + 1;
          this._tokens.push(...this.withTokenSpans(tokens, { start: stateStartIndex, end: stateEndIndex }));
        }

        if (pushState) {
          this._stack.push(this._state);
        }

        if (popState) {
          this._stack.pop();
        }

        this._state = state;
      } catch (err) {
        const isError = err instanceof Error;
        if (isError && err.cause === EOF) {
          eof = true;
        } else {
          const neighbourhood = 15;
          let startInterval = stateStartIndex;
          let i = stateStartIndex;  
          let stop = false;

          /*
            We assure that the first word of neighbourhood
            to be printed fully and not cut

            When we find a space we are sure the word is ended
          */
          while (!stop) {
            const chardCode = this._input.charCodeAt(i); 
            if (chardCode === LF || chardCode === CR || (startInterval - i > neighbourhood && chardCode === SPACE)) {
              // + 1 to ignore the LF, CR or SPACE in the interval to be printed
              startInterval = i + 1;
              stop = true;
            } else {
              i--;
            } 
          }

          const currentIndex = cursor.currentChar.index;
          /*
            To print successfully the character that throw the expection we need to add 1 to the stateEndIndex

            If state throw when reading the first character currentIndex and stateStartIndex are equal
            Just in this case we need to add an extra 1 (and we obtain + 2)
          */
          const stateEndIndex = currentIndex <= stateStartIndex ? currentIndex + 2 : currentIndex + 1;
          let endInterval = stateEndIndex
          i = endInterval;
          stop = false;

          /*
            We assure that the last word of neighbourhood
            to be printed fully and not cut

            When we find a space or the row is finished we are sure the word is ended
          */
          while (!stop) {
            const chardCode = this._input.charCodeAt(i); 
            if (chardCode === LF || chardCode === CR || (i - endInterval > neighbourhood && chardCode === SPACE)) {
              // - 1 to ignore the LF, CR or SPACE in the interval to be printed
              endInterval = i - 1;
              stop = true;
            } else {
              i++;
            } 
          }
          
          const previousNeighbourhood = slice(this._input, startInterval, stateStartIndex).replace(/^\s+/, '');
          const underlinedError = `\x1b[4m${slice(this._input, stateStartIndex, stateEndIndex)}\x1b[0m`;
          const nextNeighbourhood = slice(this._input, stateEndIndex + 1, endInterval).replace(/\s+$/, '');
          const message = isError ? err.message : err;
          throw`${cursor.getPositionFromCharacterIndex(stateEndIndex + 1)} ${message}\n ---> ${previousNeighbourhood}${underlinedError}${nextNeighbourhood}`;
        }
      }
    }

    return this._tokens;
  }

  /**
   * Ensures every emitted token has a source span.
   *
   * States can provide a more accurate `token.span` (e.g. Event Parameter and Import States)
   * otherwise the lexer falls back to the full state-consumption range.
   */
  private withTokenSpans(tokens: TokenWithOptionalSpan[], fallbackSpan: Span): Token[] {
    return tokens.map<Token>(token => ({
      ...token,
      span: token.span ?? fallbackSpan
    }));
  }
}