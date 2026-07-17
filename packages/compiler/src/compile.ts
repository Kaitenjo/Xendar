import { Generator } from './generator/generator';
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { TypeChecker } from './type-checker/type-checker';

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
export function compile(input: string, className: string, cssVariableName?: string): { javascript: string, typescript: string } {
  const tokens = new Lexer(input).tokenize();
  const nodes = new Parser(tokens).parse();
  return {
    javascript: new Generator(nodes).generate(cssVariableName),
    typescript: new TypeChecker(nodes).generate(className)
  } 
}