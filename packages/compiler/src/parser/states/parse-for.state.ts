import { NoArgsFunction } from '@xaendar/types';
import ts from 'typescript';
import { TokenType } from '../../lexer/types/token-type.enum';
import { ForToken } from '../../lexer/types/tokens/for-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ForExpression } from '../types/for-expression.type';
import { ASTNodeType } from '../types/node.enum';
import { ForImplicitVariables } from '../types/nodes/for-implicit-variables';
import { ForNode } from '../types/nodes/for-node.type';
import { validateExpression } from '../utils/expression-validator';
import { parseBlockChildren } from './parse-block-children.state';

/**
 * Parses a `@for` directive, consuming the FOR token, the CONDITION token,
 * the BLOCK_OPEN token, and all child nodes until BLOCK_CLOSE.
 *
 * @param cursor - Parser cursor positioned at the FOR token.
 * @param parseNode - Parser function for recursive child parsing.
 * @param _token - The FOR token (consumed for position advancement).
 * @returns The parsed `ForNode`.
 */
export function parseForControlFlow(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, _token: ForToken): ForNode {
  // consume FOR
  cursor.advance();

  const conditionToken = cursor.peek();
  if (conditionToken.type !== TokenType.CONDITION) {
    throw new Error(`[Parser] Expected CONDITION after FOR, got ${TokenType[conditionToken.type]}`);
  }
  const expression = parseForExpression(conditionToken.parts[0], 0);

  // consume CONDITION and BLOCK_OPEN
  cursor.advance(2);

  const children = parseBlockChildren(cursor, parseNode);

  return { type: ASTNodeType.For, ...expression, children };
}

/**
 * Parses the body of an `@for` block into a structured {@link ForExpression}.
 *
 * The expected format is:
 * ```
 * item of iterable; track expr[; $implicit = alias, ...]
 * ```
 *
 * @param source     - The raw string content of the `@for(...)` expression.
 * @param baseOffset - Character offset of `source` within the original template,
 *                     used to produce accurate diagnostic positions.
 * @returns A {@link ForExpression} object. When unrecoverable syntax errors are
 *          found the returned object contains only `diagnostics`.
 */
export function parseForExpression(source: string, baseOffset: number): ForExpression {
  const sections = splitForSections(source);

  if (sections.length < 2) {
    throw new Error(`[Parser] @for requires at least "item of iterable; track expr".`);
  }

  // ---- Section 1: "item of items" ----
  const iterSection = sections[0]!.trim();
  const ofIndex = iterSection.indexOf(' of ');

  if (ofIndex === -1) {
    throw new Error(`[Parser] @for expression must be in the form "item of iterable".`);
  }

  const itemAlias = iterSection.slice(0, ofIndex).trim();
  const iterableSource = iterSection.slice(ofIndex + 4).trim();

  if (!isValidIdentifier(itemAlias)) {
    throw new Error(`[Parser] '${itemAlias}' is not a valid item alias.`);
  }

  // Validate the iterable as a JS expression.
  const iterValidation = validateExpression(iterableSource);

  // ---- Section 2: "track item.id" ----
  const trackSection = sections[1]!.trim();

  if (!trackSection.startsWith('track ')) {
    throw new Error(`[Parser] Second section of @for must start with "track".`);
  }

  const trackSource = trackSection.slice(6).trim();
  const trackValidation = validateExpression(trackSource);

  // ---- Section 3 (optional): "$index = i, $last = l" ----
  const implicitAliases = new Map<ForImplicitVariables, string>;

  if (sections.length >= 3 && sections[2] !== undefined) {
    const aliasSection = sections[2].trim();
    const aliasOffset = baseOffset + source.indexOf(sections[2]);
    parseImplicitAliases(aliasSection, aliasOffset, implicitAliases);
  }

  return {
    itemAlias,
    iterableExpression: iterValidation.node,
    iterableSource,
    trackExpression: trackValidation.node,
    trackSource,
    implicitAliases
  };
}

/**
 * Parses the optional third section of an `@for` expression, which declares
 * aliases for implicit loop variables (e.g. `$index = i, $last = l, $even = isEven`).
 *
 * Valid entries are comma-separated pairs in the form `$implicit = alias`.
 *
 * @param source - The raw alias-declarations string (everything after the second `;`).
 * @param baseOffset - Character offset of `source` within the original template.
 * @param out - Map to populate with `alias → implicit-variable` entries.
 */
function parseImplicitAliases(source: string, baseOffset: number, out: Map<ForImplicitVariables, string>): void {
  const entries = source.split(',');
  let cursor = 0;
  
  const IMPLICIT_VARIABLES = new Set(['$index', '$last', '$first', '$even', '$odd']);

  for (const entry of entries) {
    const trimmed = entry.trim();
    const eqIndex = trimmed.indexOf('=');

    if (eqIndex === -1) {
      throw new Error(`[Parser] Invalid alias declaration '${trimmed}'. Expected '$implicit = alias'.`);
    }

    cursor += entry.length + 1;
    const alias = trimmed.slice(0, eqIndex).trim();
    const implicit = trimmed.slice(eqIndex + 1).trim();

    const isImplicitVariable = (value: string): value is ForImplicitVariables => IMPLICIT_VARIABLES.has(value);
    
    if (!isImplicitVariable(implicit)) {
      throw new Error(`[Parser] '${implicit}' is not a known implicit variable. Known variables: ${[...IMPLICIT_VARIABLES].join(', ')}.`);
    }

    cursor += entry.length + 1;
    if (!isValidIdentifier(alias)) {
      throw new Error(`[Parser] '${alias}' is not a valid alias identifier.`);
    }

    cursor += entry.length + 1;
    if (out.has(implicit)) {
      throw new Error(`[Parser] '${implicit}' is already aliased in this @for expression.`);
    } else {
      out.set(implicit, alias);
    }

    cursor += entry.length + 1;
  }
}

/**
 * Splits the raw `@for(...)` body into its semicolon-delimited sections,
 * respecting nested brackets and string literals so that semicolons inside
 * them are never treated as section separators.
 *
 * Example input:  `"item of items; track item.id; $index = i"`
 * Example output: `["item of items", " track item.id", " $index = i"]`
 *
 * @param source - The raw content of the `@for(...)` expression.
 * @returns An array of section strings (without the `;` separators).
 */
function splitForSections(source: string): string[] {
  const sections = new Array<string>;
  let current = '';
  let depth = 0;
  let inString: '"' | "'" | '`' | null | undefined;

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;

    if (!current && char === ' ') {
      continue;
    }

    if (inString) {
      current += char;
      if (char === inString && source[i - 1] !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      current += char;
      continue;
    }

    // Brackets — do not split inside nested bracket pairs.
    if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
      continue;
    }

    if (char === ')' || char === ']' || char === '}') {
      depth--;
      current += char;
      continue;
    }

    // Section separator — only split when not inside brackets or strings.
    if (char === ';' && depth === 0) {
      sections.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  // Push the last section even when it has no trailing `;`.
  if (current.trim().length) {
    sections.push(current);
  }

  return sections;
}

/**
 * Checks whether `name` is a valid JavaScript identifier by delegating to
 * the TypeScript parser.
 *
 * A string is considered valid when the TS parser produces a single
 * `ExpressionStatement` whose expression is an `Identifier` with the
 * same text.
 *
 * @param name - The string to validate.
 * @returns `true` if `name` is a valid JS identifier, `false` otherwise.
 */
function isValidIdentifier(name: string): boolean {
  if (!name.length) {
    return false;
  }

  const sourceFile = ts.createSourceFile('__id.ts', name, ts.ScriptTarget.ESNext, false);
  const statement = sourceFile.statements[0];
  return !!statement && ts.isExpressionStatement(statement) && ts.isIdentifier(statement.expression) && statement.expression.text === name;
}