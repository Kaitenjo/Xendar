import { Stack } from '@xaendar/common';
import { Dictionary } from '@xaendar/types';
import { EOF } from '../costants/chars.constants';
import { lexAttributeValue } from './states/lex-attribute-value.state';
import { lexAttribute } from './states/lex-attribute.state';
import { lexCaseFlowControlCondition } from './states/lex-case-flow-control-condition.state';
import { lexDefaultFlowControlCondition } from './states/lex-default-flow-control-condition.state';
import { lexEventParameter } from './states/lex-event-parameter.state';
import { lexEvent } from './states/lex-event.state';
import { lexFlowControl } from './states/lex-flow-control';
import { lexFlowControlBlock } from './states/lex-flow-control-block.state';
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
import { Token } from './types/token.type';
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
    [LexerState.EVENT_PARAMETER]: lexEventParameter,
    [LexerState.FLOW_CONTROL]: lexFlowControl,
    [LexerState.FLOW_CONTROL_CONDITION]: lexDefaultFlowControlCondition,
    [LexerState.CASE_FLOW_CONTROL_CONDITION]: lexCaseFlowControlCondition,
    [LexerState.FLOW_CONTROL_BLOCK]: lexFlowControlBlock,
    [LexerState.INTERPOLATION]: lexInterpolation,
    [LexerState.INTERPOLATION_EXPRESSION]: lexInterpolationExpression,
    [LexerState.INTERPOLATION_LITERAL]: lexInterpolationliteral,
    [LexerState.IMPORT]: lexImport
  }

  /**
   * Creates a new Lexer instance for the given template content.
   *
   * @param input - The full template text to tokenise.
   */
  constructor(public input: string) {
    this._cursor = new LexerCursor(this.input);
  }

  /**
   * Runs the lexer over the input string and returns the full token array.
   * Drives the state machine until EOF is reached.
   *
   * @returns Array of all tokens produced from the input.
   */
  public tokenize(): Token[] {
    let eof = false;

    while (!eof) {
      try {
        const transitionFunction = this._states[this._state];
        const { state, tokens, popState, pushState } = transitionFunction!(this._cursor, { 
          history: this._stack.values,
          tokens: [...this._tokens] 
        });
        
        if (tokens?.length) {
          this._tokens.push(...tokens);
        }
        
        if (pushState) {
          this._stack.push(this._state);
        }
        
        if (popState) {
          this._stack.pop();
        } 
        
        this._state = state;
      } catch (err) {
        const error = err as Error;
        if (error.cause === EOF) {
          eof = true;
        } else {
          console.log(`Something went wrong while computing state ${this._state} at ${this._cursor.formattedPosition}`);
          throw err;
        }
      }
    }

    return this._tokens;
  }
}