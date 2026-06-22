import { ForImplicitVariables } from '../../parser/types/nodes/for-implicit-variables';
import { ForNode } from '../../parser/types/nodes/for-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { processNode } from '../render-generator';
import { getBlockIdentifier, getTextIdentifier } from '../utils/render-generator.utils';

/**
 * Generates code for a `@for` iteration node.
 *
 * Emits a classic index-based `for` loop with all implicit variables
 * declared at the top of the loop body:
 *
 * ```javascript
 * for (let $i = 0; $i < ctx_items.length; $i++) {
 *   const item = items[$i];
 *   const $index = $i;
 *   const $first = $i === 0;
 *   const $last  = $i === items.length - 1;
 *   const $even  = $i % 2 === 0;
 *   const $odd   = $i % 2 !== 0;
 *   // ... child nodes
 * }
 * ```
 *
 * The iterable identifier is resolved through the active {@link Context}:
 * if found in scope it is used as-is, otherwise `this.` is prepended.
 *
 * The internal loop counter is always named `$i_<nodeName>` to avoid
 * collisions when `@for` blocks are nested.
 *
 * @param node - The `ForNode` to process.
 * @param nodeName - Base variable name prefix used for child nodes and
 *   to produce a unique loop counter identifier.
 * @param parentNode - Variable name of the parent DOM node.
 * @param compilerContext - The enclosing scope context.
 * @returns Array of generated code lines.
 */
export function processFor(node: ForNode, nodeName: string, parentNode: string, compilerContext: CompilerContext): { 
  mainBlock: string[], 
  fns: Map<string, { code: string[], args: [parentElement: string, parentContext: string, items: string, index: string] }> 
} {
  const mainBlock = new Array<string>;
  const functionsToProcess = new Map<string, { code: string[], args: [parentElement: string, parentContext: string, items: string, index: string] }>();

  const iterableSource = node.iterableSource;
  const iterableExpr = compilerContext.hasIdentifier(iterableSource) ? iterableSource : `this.${iterableSource}`;

  const itemsName = getTextIdentifier(parentNode, nodeName, 'items');
  const counterName = getTextIdentifier(parentNode, nodeName, 'i');

  const indexName = resolveImplicit(node, '$index');
  const firstName = resolveImplicit(node, '$first');
  const lastName = resolveImplicit(node, '$last');
  const evenName = resolveImplicit(node, '$even');
  const oddName = resolveImplicit(node, '$odd');
  const forContext = new CompilerContext([node.itemAlias, indexName, firstName, lastName, evenName, oddName], compilerContext);

  const forKey = getBlockIdentifier(parentNode, nodeName, 'for');
  functionsToProcess.set(forKey, {
    code: [
`const { ${node.itemAlias}, ${indexName}, ${firstName}, ${lastName}, ${evenName}, ${oddName} } = _iterationVariables(${itemsName}, ${counterName}, '${node.itemAlias}', { 
    $index: '${indexName}', 
    $first: '${firstName}', 
    $last: '${lastName}', 
    $even: '${evenName}', 
    $odd: '${oddName}' 
  });`,
      ...node.children.flatMap((child, i) => processNode(child, `${nodeName}_${i}`, parentNode, forContext))
    ],
    args: [parentNode, 'parentContext', itemsName, counterName]
  });

  mainBlock.push(`_for(${parentNode}, context, () => ${iterableExpr}, this.${forKey}.bind(this));`);

  return {
    mainBlock,
    fns: functionsToProcess
  }
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