import { slice } from '@xaendar/common';
import { Cursor } from '../models/cursor.js';
import { ASTNode } from '../parser/types/ast.type.js';
import { ASTNodeType } from '../parser/types/node.enum.js';
import { ImportNode } from '../parser/types/nodes/import-node.type.js';
import { Span } from '../types/span.type.js';
import { TypeCheckContext } from './models/type-checker-context.js';
import { typeCheckElement } from './states/type-check-element.state.js';
import { typeCheckFor } from './states/type-check-for.state.js';
import { typeCheckIf } from './states/type-check-if.state.js';
import { typeCheckSwitch } from './states/type-check-switch.state.js';
import { typeCheckTextAndInterpolation } from './states/type-check-text-and-interpolation.state.js';
import { Line, LineMapping } from './types/generated-line.type.js';
import { TypeCheckResult } from './types/type-checker-result.type.js';
import { TypeCheckerStates } from './types/type-checker-states.type.js';
import { indentLines, plain } from './utils/line-builder.utils.js';
import { extractComponentsMetadataFromSourceFile, resolveModulePath } from '../utils/metadata.utils.js';
import { createSourceFile, ScriptTarget } from 'typescript';
import { readFile } from 'fs/promises';
import { CompileOptions } from '../compile-options.type.js';
import { TypeCheckerCache } from './types/typechecker-cache.type.js';

/**
 * Generates a single, flat TypeScript function body ("shim") from a
 * template AST, meant only to be fed to the TS compiler / LanguageService
 * for diagnostics — it is never executed and never emitted as real output.
 *
 * This deliberately does NOT mirror the JS code generator's structure:
 *
 * - No variable is declared per HTML element. Element identifiers exist in
 *   the JS output purely so runtime code can create/reference the actual
 *   DOM node; a type-check expression never references "the element
 *   itself" (the DSL has no template-ref syntax), so an `HTMLElement`
 *   local would add zero type-checking value.
 * - No control-flow block gets its own function. In the JS output, each
 *   `@if`/`@for`/`@switch` becomes a separate function because it needs
 *   its own runtime closure over the `Context` chain. The type checker has
 *   no runtime at all, so real, nested TypeScript blocks — `if`, `for`,
 *   `switch` — give correct scoping and (as a bonus) real control-flow
 *   narrowing, for free, with no synthetic machinery.
 *
 * Every AST node turns directly into TypeScript lines, recursively, inside
 * one single `typeCheck()` function.
 */
export class TypeChecker {
  private _cache?: TypeCheckerCache;
  /** 
   * Shared mutable state threaded through all state functions during a single `generate()` call. 
   */
  private readonly _context = new TypeCheckContext();
  /** 
   * Maps each `ASTNodeType` to the state function responsible for emitting its type-check lines. 
   */
  private readonly _states: TypeCheckerStates = {
    [ASTNodeType.Text]: typeCheckTextAndInterpolation,
    [ASTNodeType.Interpolation]: typeCheckTextAndInterpolation,
    [ASTNodeType.Element]: typeCheckElement,
    [ASTNodeType.If]: typeCheckIf,
    [ASTNodeType.For]: typeCheckFor,
    [ASTNodeType.Switch]: typeCheckSwitch,
    [ASTNodeType.Import]: () => []
  };

  /**
   * @param _input - Raw template source string, used only to slice diagnostic spans into error messages.
   * @param _ast   - Parsed AST produced by the `Parser` for this template.
   */
  constructor(private _input: string, private _ast: ASTNode[]) { }

  /**
   * Pre-populates the shared context with component and directive metadata
   * by parsing source files for all `@import` nodes in the AST.
   *
   * Must be awaited before calling `generate()` if metadata-driven
   * validation (e.g. unknown component inputs) is desired.
   *
   * @param baseDir - Absolute path used to resolve relative import paths.
   */
  public async populateImportMetadata(baseDir: string): Promise<void> {
    const importNodes = this._ast.filter((node): node is ImportNode => node.type === ASTNodeType.Import);

    await Promise.all(
      importNodes.flatMap(node =>
        node.specifiers
          .filter(({ imported }) => imported !== '*')
          .map(async ({ imported, local }) => {
            const symbolName = imported === 'default' ? local : imported;
            // TODO Non è conveniente estrarre i metadati tutte le volte. Piu template potrebbero aver bisogno
            // degli stessi metadata, sarebbe meglio una cache globale a livello di compilatore per evitare il ricalcolo
            // ad ogni template
            let metadata = this._cache?.get(symbolName);
            if (!metadata) {
              const sourceFile = createSourceFile('', await readFile(resolveModulePath(node.path, baseDir)!, 'utf-8'), ScriptTarget.Latest, true);
              const metadatas = await extractComponentsMetadataFromSourceFile(sourceFile);
              metadata = metadatas?.get(symbolName);
              if (!metadata) {
                throw new Error(`Metadata for symbol "${symbolName}" not found.`);
              }
              this._cache?.set(symbolName, metadata);
            }
            
            this._context.addImport(metadata);
          }
        )
      )
    );
  }

  /**
   * Generates the full `function typeCheck() { ... }` shim body for the
   * component's template.
   *
   * A `let $event!: Event;` declaration is prepended only if the generated
   * body actually references `$event` (event handler bindings), so shims
   * for templates with no event bindings don't carry an unused local —
   * relevant if the consuming project has `noUnusedLocals` enabled.
   * 
   * @param baseDir - Absolute path used to resolve relative import paths
   */
  public async generate(baseDir: string, cache?: TypeCheckerCache): Promise<TypeCheckResult> {
    try {
      if (cache) {
        this._cache = cache;
      }

      await this.populateImportMetadata(baseDir);
      const body = this._ast.flatMap(node => this._processNode(node, this._context));

      const lines: Line[] = [
        plain('function typeCheck() {'),
        ...indentLines(body),
        plain('}'),
      ];

      return {
        text: lines.map(line => line.text).join('\n'),
        mappingTable: this.buildMappingTable(lines)
      };
    } catch (err) {
      let message: string | unknown;
      let span: Span | undefined;

      if (err instanceof Error) {
        const cause = err.cause
        span = !!cause && typeof cause === 'object' && 'start' in cause && 'end' in cause ? cause as Span : undefined;
        message = err.message;
      } else {
        message = err;
      }
      throw span
        ? `${new Cursor(this._input).getPositionFromCharacterIndex(span.start + 1)} - ${message}\n ---> ${slice(this._input, span.start, span.end)}}`
        : message;
    }
  }

  private buildMappingTable(lines: Line[]): TypeCheckResult['mappingTable'] {
    const table = new Map<number, readonly LineMapping[]>();
    lines.forEach((line, index) => {
      if (line.mappings) {
        table.set(index, line.mappings)
      };
    });
    return table;
  }
  /**
   * Dispatches a single AST node to its state function, passing itself
   * back down as `processNode` so state functions can recurse into their
   * own children inline.
   */
  private _processNode = (node: ASTNode, context: TypeCheckContext): Line[] => {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`No transition function for ASTNode of type ${ASTNodeType[node.type]}`, { cause: node.span })
    }

    return state(node as never, this._processNode, context);
  };
}