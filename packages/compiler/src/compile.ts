import { Generator } from './generator/generator';
import { Lexer } from './lexer/lexer';
import { TokenType } from './lexer/types/token-type.enum';
import { Parser } from './parser/parser';
import { parseElement } from './parser/states/compiler/parse-element.state';
import { parseForControlFlow } from './parser/states/compiler/parse-for.state';
import { parseIfControlFlow } from './parser/states/compiler/parse-if.state';
import { parseImport } from './parser/states/compiler/parse-import.state';
import { parseInterpolation } from './parser/states/compiler/parse-interpolation.state';
import { parseSwitchControlFlow } from './parser/states/compiler/parse-switch.state';
import { parseText } from './parser/states/compiler/parse-text.state';

/**
 * Compiles a template string into a Javascript render function body.
 *
 * Runs the three-stage pipeline:
 * 1. **Lexer** — tokenises the raw template text.
 * 2. **Parser** — transforms the token stream into an AST.
 * 3. **Render generator** — emits Javascript source lines from the AST.
 *
 * @param input - The raw HTML-like template source to compile.
 * @param cssVariableName - Optional name of the CSS variable to inject
 *   into the generated `adoptedStyleSheets` assignment.
 * @returns A string containing the compiled Javascript render method body.
 */
export function compile(input: string, cssVariableName?: string): string {
  const tokens = new Lexer(input).tokenize();
  const nodes = new Parser(tokens, {
    [TokenType.TEXT]: parseText,
    [TokenType.INTERPOLATION_EXPRESSION]: parseInterpolation,
    [TokenType.INTERPOLATION_LITERAL]: parseInterpolation,
    [TokenType.TAG_OPEN_NAME]: parseElement,
    [TokenType.IF]: parseIfControlFlow,
    [TokenType.FOR]: parseForControlFlow,
    [TokenType.SWITCH]: parseSwitchControlFlow,
    [TokenType.IMPORT]: parseImport
  }).parse();
  return new Generator(nodes, cssVariableName).generate();
}