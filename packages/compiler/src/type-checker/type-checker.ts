import { indent } from '@xaendar/common';
import { CompilerContext } from '../generator/models/compiler-context.model.js';
import { skipGeneration } from '../generator/states/skip-generation.state.js';
import { ASTNode } from '../parser/types/ast.type.js';
import { ASTNodeType } from '../parser/types/node.enum.js';
import { typeCheckElement } from './states/type-check-element.state.js';
import { typeCheckFor } from './states/type-check-for.state.js';
import { typeCheckIf } from './states/type-check-if.state.js';
import { typeCheckSwitch } from './states/type-check-switch.state.js';
import { typeCheckTextAndInterpolation } from './states/type-check-text-and-interpolation.state.js';
import { TypeCheckerStates } from './types/type-checker-states.type.js';

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
  private readonly _states: TypeCheckerStates = {
    [ASTNodeType.Text]: typeCheckTextAndInterpolation,
    [ASTNodeType.Interpolation]: typeCheckTextAndInterpolation,
    [ASTNodeType.Element]: typeCheckElement,
    [ASTNodeType.If]: typeCheckIf,
    [ASTNodeType.For]: typeCheckFor,
    [ASTNodeType.Switch]: typeCheckSwitch,
    [ASTNodeType.Import]: skipGeneration as never,
  };

  constructor(private _ast: ASTNode[]) { }

  /**
   * Generates the full `function typeCheck() { ... }` shim body for the
   * component's template.
   *
   * A `let $event!: Event;` declaration is prepended only if the generated
   * body actually references `$event` (event handler bindings), so shims
   * for templates with no event bindings don't carry an unused local —
   * relevant if the consuming project has `noUnusedLocals` enabled.
   */
  public generate(): string {
    const context = new CompilerContext();
    const body = this._ast.flatMap((node, i) => this._processNode(node, context, i.toString()));

    const usesEvent = body.some(line => line.includes('$event'));

    return [
      'function typeCheck() {',
      ...indent(usesEvent ? ['let $event!: Event;', ...body] : body),
      '}',
    ].join('\n');
  }

  /**
   * Dispatches a single AST node to its state function, passing itself
   * back down as `processNode` so state functions can recurse into their
   * own children inline.
   */
  private _processNode = (node: ASTNode, context: CompilerContext, index: string): string[] => {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`[Type Checker] No transition function for token type ${ASTNodeType[node.type]}`);
    }

    return state(node as never, context, index, this._processNode);
  };
}