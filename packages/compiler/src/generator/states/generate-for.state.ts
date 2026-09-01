import { ForImplicitVariables } from '../../parser/types/nodes/for-implicit-variables';
import { ForNode } from '../../parser/types/nodes/for-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from '../types/generator-transition-function-return-type.type';
import { getBlockIdentifier, getTextIdentifier, resolveExpression } from '../utils/generator.utils';

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
 * @param index - Base variable name prefix used for child nodes and
 *   to produce a unique loop counter identifier.
 * @param parentNode - Variable name of the parent DOM node.
 * @param compilerContext - The enclosing scope context.
 * @returns Array of generated code lines.
 */
export function generateFor(node: ForNode, parentNode: string, index: string, compilerContext: CompilerContext): GeneratorTransitionFunctionReturnType {
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  }

  const iterableSource = node.iterableSource;
  const iterableExpr = compilerContext.hasIdentifier(iterableSource) ? iterableSource : `this.${iterableSource}`;

  const itemsName = getTextIdentifier('items', parentNode, index);
  const counterName = getTextIdentifier('i', parentNode, index);

  const indexName = resolveImplicit(node, '$index');
  const firstName = resolveImplicit(node, '$first');
  const lastName = resolveImplicit(node, '$last');
  const evenName = resolveImplicit(node, '$even');
  const oddName = resolveImplicit(node, '$odd');
  const forContext = new CompilerContext(compilerContext);

  forContext.addIdentifier(node.itemAlias);
  const identifiers = [indexName, firstName, lastName, evenName, oddName];
  for (let i = 0; i < identifiers.length; i++) {
    forContext.addUnresolvableIdentifier(identifiers[i], 'signal');
  }

  const forKey = getBlockIdentifier('for', parentNode, index);
  retVal.functionsToProcess!.set(forKey, {
    fn: {
      precode:
`const { vars, update } = _iterationVariables(context, ${itemsName}, ${counterName}, '${node.itemAlias}', { 
    $index: '${indexName}', 
    $first: '${firstName}', 
    $last: '${lastName}', 
    $even: '${evenName}', 
    $odd: '${oddName}' 
  });
  const { ${node.itemAlias}, ${indexName}, ${firstName}, ${lastName}, ${evenName}, ${oddName} } = vars;`,
      node,
      parentNode: forKey,
      context: forContext,
      anchor: 'anchor',
      isForBody: true
    },
    args: [forKey, 'parentContext', itemsName, counterName, 'anchor']
  });

  retVal.code.push(`_for(${parentNode}, context, () => ${iterableExpr}, (${node.itemAlias}, ${indexName}) => ${resolveExpression(node.trackExpression, forContext, { skipResolution: true }).expression}, this.${forKey}.bind(this));`);

  return retVal
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