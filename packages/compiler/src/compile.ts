import { Generator } from './generator/generator';
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { ASTNode } from './parser/types/ast.type';
import { TypeChecker } from './type-checker/type-checker';
import { TypeCheckResult } from './type-checker/types/type-checker-result.type';

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
export async function compile(input: string, options: { baseDir: string }): Promise<TypeCheckResult>
export async function compile(input: string, options: { cssVariableName: string | undefined }): Promise<string>
export async function compile(input: string, options: { baseDir: string, cssVariableName?: string }): Promise<{ javascript: string; typescript: TypeCheckResult }>
export async function compile(input: string, options: { baseDir?: string, cssVariableName?: string | undefined }): Promise<string | TypeCheckResult | { javascript: string; typescript: TypeCheckResult }> {
  const tokens = new Lexer(input).tokenize();
  const nodes = new Parser(input, tokens).parse();

  if (!('baseDir' in options || 'cssVariableName' in options)) {
    throw `CssVariableName or BaseDir must be specified`;
  }
  
  const { baseDir, cssVariableName } = options;
  if (cssVariableName && baseDir) {
    return {
      javascript: generateJavascriptCode(input, nodes, cssVariableName),
      typescript: await generateTypecheckResult(input, nodes, baseDir)
    }
  } else if (baseDir) {
    return await generateTypecheckResult(input, nodes, baseDir);
  } else {
    return generateJavascriptCode(input, nodes, cssVariableName);
  }
}

function generateJavascriptCode(input: string, nodes: ASTNode[], cssVariableName: string | undefined): string {
  return new Generator(input, nodes).generate(cssVariableName);
}

async function generateTypecheckResult(input: string, nodes: ASTNode[], baseDir: string): Promise<TypeCheckResult> {
  return await new TypeChecker(input, nodes).generate(baseDir);
}