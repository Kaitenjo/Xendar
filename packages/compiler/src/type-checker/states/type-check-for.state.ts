import { indent } from '@xaendar/common';
import { CompilerContext } from '../../generator/models/compiler-context.model';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { ForImplicitVariables } from '../../parser/types/nodes/for-implicit-variables';
import { ForNode } from '../../parser/types/nodes/for-node.type';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks an `@for` block using a real `for...of` loop.
 *
 * This replaces the previous "synthetic function with a `typeof array`
 * parameter" trick, which mistyped the loop variable as the *whole array*
 * rather than a single element. A real `for (const item of array)` lets
 * TypeScript infer `item`'s type correctly as the array's element type —
 * exactly like it would for a loop written by hand — with no synthetic
 * function boundary needed.
 */
export function typeCheckFor(node: ForNode, context: CompilerContext, index: string, processNode: ProcessNode): string[] {
  const iterableExpr = context.hasIdentifier(node.iterableSource)
    ? node.iterableSource
    : `root.${node.iterableSource}`;

  const indexName = resolveImplicit(node, '$index');
  const firstName = resolveImplicit(node, '$first');
  const lastName = resolveImplicit(node, '$last');
  const evenName = resolveImplicit(node, '$even');
  const oddName = resolveImplicit(node, '$odd');

  const forContext = new CompilerContext(
    [node.itemAlias, [indexName, 'signal'], [firstName, 'signal'], [lastName, 'signal'], [evenName, 'signal'], [oddName, 'signal']],
    context,
  );

  const lines: string[] = [];
  lines.push(`for (const ${node.itemAlias} of ${iterableExpr}) {`);
  lines.push(...indent([
    // Implicit loop variables have no expression to derive a type from —
    // their types are well-known constants, so they're declared directly.
    `let ${indexName}!: number;`,
    `let ${firstName}!: boolean;`,
    `let ${lastName}!: boolean;`,
    `let ${evenName}!: boolean;`,
    `let ${oddName}!: boolean;`,
    `${resolveExpression(node.trackExpression, forContext, { resolver: 'root' })};`,
    ...node.children.flatMap((child, i) => processNode(child, forContext, i.toString())),
  ]));
  lines.push('}');

  return lines;
}

/**
 * Resolves the name that should be used in generated code for a given
 * implicit variable.
 *
 * If the template declared an explicit alias for the variable
 * (e.g. `; $index = i`) that alias is returned. Otherwise the default
 * implicit variable name (e.g. `$index`) is used.
 *
 * @param node - The `ForNode` whose implicit alias map is consulted.
 * @param implicit - The implicit variable to look up (e.g. `'$index'`).
 * @returns The alias string if one was declared, otherwise `implicit` itself.
 */
function resolveImplicit(node: ForNode, implicit: ForImplicitVariables): string {
  return node.implicitAliases.get(implicit) ?? implicit;
}