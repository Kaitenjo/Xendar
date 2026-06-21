import { Stack } from '@xaendar/common';
import { Dictionary } from '@xaendar/types';
import { EOF } from '../costants/chars.constants';
import { consumeAttributeValue } from './states/attribute-value.state';
import { consumeAttribute } from './states/attribute.state';
import { consumeCaseFlowControlCondition } from './states/case-flow-control-condition.state';
import { consumeDefaultFlowControlCondition } from './states/default-flow-control-condition.state';
import { consumeEvent } from './states/event.state';
import { consumeFlowControl } from './states/flow-control';
import { consumeFlowControlBlock } from './states/flow-control-block.state';
import { consumeInterpolationExpression } from './states/interpolation-expression.state';
import { consumeInterpolationliteral } from './states/interpolation-literal.state';
import { consumeInterpolation } from './states/interpolation.state';
import { consumeTagBody } from './states/tag-body.state';
import { consumeTagClose } from './states/tag-close.state';
import { consumeTagOpenEnd } from './states/tag-open-end.state';
import { consumeTagOpenName } from './states/tag-open-name.state';
import { consumeText } from './states/text.state';
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
  private _state = LexerState.START;
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
    [LexerState.START]: consumeText,
    [LexerState.TEXT]: consumeText,
    [LexerState.TAG_OPEN_NAME]: consumeTagOpenName,
    [LexerState.TAG_BODY]: consumeTagBody,
    [LexerState.TAG_OPEN_END]: consumeTagOpenEnd,
    [LexerState.TAG_CLOSE]: consumeTagClose,
    [LexerState.ATTRIBUTE]: consumeAttribute,
    [LexerState.ATTRIBUTE_VALUE]: consumeAttributeValue,
    [LexerState.FLOW_CONTROL]: consumeFlowControl,
    [LexerState.FLOW_CONTROL_CONDITION]: consumeDefaultFlowControlCondition,
    [LexerState.CASE_FLOW_CONTROL_CONDITION]: consumeCaseFlowControlCondition,
    [LexerState.FLOW_CONTROL_BLOCK]: consumeFlowControlBlock,
    [LexerState.EVENT]: consumeEvent,
    [LexerState.INTERPOLATION]: consumeInterpolation,
    [LexerState.INTERPOLATION_EXPRESSION]: consumeInterpolationExpression,
    [LexerState.INTERPOLATION_LITERAL]: consumeInterpolationliteral
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
          throw err;
        }
      }
    }

    return this._tokens;
  }
}