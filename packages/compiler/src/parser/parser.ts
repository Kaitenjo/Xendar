import { TokenType } from "../lexer/types/token-type.enum.js";
import { Token } from "../lexer/types/token.type.js";
import { ParserCursor } from "./models/parser-cursor.model.js";
import { parseElement } from "./states/parse-element.state.js";
import { parseForControlFlow } from "./states/parse-for.state.js";
import { parseIfControlFlow } from "./states/parse-if.state.js";
import { parseInterpolation } from "./states/parse-interpolation.state.js";
import { parseSwitchControlFlow } from "./states/parse-switch.state.js";
import { parseText } from "./states/parse-text.state.js";
import { ASTNode } from "./types/ast.type.js";
import { ParserStates } from "./types/parser-states.type.js";

/**
 * Parser class that transforms a stream of tokens (from the Lexer)
 * into an Abstract Syntax Tree (AST) representing the template structure.
 *
 * Responsibilities:
 * - Parse text nodes, elements, attributes, events, and interpolations
 * - Maintain cursor state for sequential token consumption
 * - Detect tag boundaries and nested structures
 *
 * The parser assumes that the token stream is syntactically valid according
 * to the Lexer rules. Parsing errors are thrown as exceptions.
 */
export class Parser {
  /**
   * Internal cursor for navigating tokens
   */
  private readonly _cursor: ParserCursor;
  /**
   * Mapping of token types to their corresponding parser transition functions, 
   * which handle the logic for parsing each token type into AST nodes.
   */
  private readonly _states: ParserStates = {
    [TokenType.TEXT]: parseText,
    [TokenType.INTERPOLATION_EXPRESSION]: parseInterpolation,
    [TokenType.INTERPOLATION_LITERAL]: parseInterpolation,
    [TokenType.TAG_OPEN_NAME]: parseElement,
    [TokenType.IF]: parseIfControlFlow,
    [TokenType.FOR]: parseForControlFlow,
    [TokenType.SWITCH]: parseSwitchControlFlow
  }

  /**
   * Creates a new Parser instance.
   *
   * @param tokens - Array of tokens produced by the Lexer.
   */
  constructor(private readonly tokens: Token[]) {
    this._cursor = new ParserCursor(this.tokens);
  }

  /**
   * Entry point for parsing the token stream into AST nodes.
   *
   * @returns Array of top-level AST nodes.
   */
  public parse(): ASTNode[] {
    const nodes = new Array<ASTNode>;
    
    while (this._cursor.peek().type !== TokenType.EOF) {
      const parseNode = this.parseNode();
      if (parseNode) {
        nodes.push(parseNode);
      }
    }

    return nodes;
  }

  /**
   * Parses the next AST node based on the current token.
   *
   * @returns The parsed AST node, or `undefined` for EOF.
   * @throws When no transition function is registered for the current token type.
   */
  private parseNode(): ASTNode | undefined {
    const token = this._cursor.peek();
    if (token.type === TokenType.EOF) {
      return;
    }
    
    const state = this._states[token.type];

    if (!state) {
      throw new Error(`[Parser] No transition function for token type ${TokenType[token.type]}`);
    }

    return state(this._cursor, this.parseNode.bind(this), token as never);
  }
}
