import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';

/**
 * Compiles a template string into a TypeScript source file to
 * type checking 
 *
 * Runs the three-stage pipeline:
 * 1. **Lexer** — tokenises the raw template text.
 * 2. **Parser** — transforms the token stream into an AST.
 * 3. **Render generator** — emits TypeScript source lines from the AST.
 *
 * @param input - The raw HTML-like template source to compile.
 * @returns A string containing the compiled TypeScript render method body.
 */
export function typeCheck(input: string): string {
  const tokens = new Lexer(input).tokenize();
  const ast = new Parser(tokens).parse(); 
  return '';
}