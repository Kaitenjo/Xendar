import { resolveExpression } from '../../generator/utils/generator.utils';
import { ForImplicitVariables } from '../../parser/types/nodes/for-implicit-variables';
import { ForNode } from '../../parser/types/nodes/for-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { Line } from '../types/generated-line.type';
import { ProcessNode } from '../types/type-checker-process-node.type';
import { indentLines, line, mapped, plain } from '../utils/line-builder.utils';

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
export function typeCheckFor(node: ForNode, processNode: ProcessNode, context: TypeCheckContext): Line[] {
  const forContext = new TypeCheckContext(context);
  const indexName = resolveImplicit(node, '$index');
  const firstName = resolveImplicit(node, '$first');
  const lastName = resolveImplicit(node, '$last');
  const evenName = resolveImplicit(node, '$even');
  const oddName = resolveImplicit(node, '$odd');

  forContext.addUnresolvableIdentifier(node.itemAlias);
  const identifiers = [indexName, firstName, lastName, evenName, oddName];
  for (let i = 0; i < identifiers.length; i++) {
    forContext.addUnresolvableIdentifier(identifiers[i], 'signal');
  }

  const lines = new Array<Line>();

  // NOTA: presuppone che ForNode esponga uno span dedicato per la sola
  // sorgente iterabile (`node.iterableSourceSpan`), distinto da `node.span`
  // (l'intero blocco @for). Se al momento il parser non lo produce, questo
  // è un buon segnale per aggiungerlo: senza, l'errore su "root.foo non
  // esiste" punterebbe sempre all'intero blocco invece che al solo nome.
  lines.push(line(
    `for (const ${node.itemAlias} of root.`,
    mapped(node.iterableSource, node.span),
    `) {`
  ));

  lines.push(...indentLines([
    plain(`let ${indexName}!: number;`),
    plain(`let ${firstName}!: boolean;`),
    plain(`let ${lastName}!: boolean;`),
    plain(`let ${evenName}!: boolean;`),
    plain(`let ${oddName}!: boolean;`),
    line(mapped(`${resolveExpression(node.trackExpression, context).expression};`, node.span)),
    ...node.children.flatMap(child => processNode(child, forContext)),
  ]));

  lines.push(plain('}'));
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