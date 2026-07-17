import { CompilerContext } from '../../generator/models/compiler-context.model';
import { getBlockIdentifier, getTextIdentifier, resolveExpression } from '../../generator/utils/generator.utils';
import { ForImplicitVariables } from '../../parser/types/nodes/for-implicit-variables';
import { ForNode } from '../../parser/types/nodes/for-node.type';
import { TypeCheckerTransitionFunctionReturnType } from '../types/type-checker-transition-function-return-type.type';

export function typeCheckFor(node: ForNode, parentNode: { identifier: string, type: string }, index: string, compilerContext: CompilerContext): TypeCheckerTransitionFunctionReturnType {
  const retVal: TypeCheckerTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  }

  const iterableSource = node.iterableSource;
  const iterableExpr = compilerContext.hasIdentifier(iterableSource) ? iterableSource : `root.${iterableSource}`;

  const itemsName = getTextIdentifier('items', parentNode.identifier, index);
  const counterName = getTextIdentifier('i', parentNode.identifier, index);

  const indexName = resolveImplicit(node, '$index');
  const firstName = resolveImplicit(node, '$first');
  const lastName = resolveImplicit(node, '$last');
  const evenName = resolveImplicit(node, '$even');
  const oddName = resolveImplicit(node, '$odd');
  const forContext = new CompilerContext([node.itemAlias, [indexName, 'signal'], [firstName, 'signal'], [lastName, 'signal'], [evenName, 'signal'], [oddName, 'signal']], compilerContext);

  const forKey = getBlockIdentifier('for', parentNode.identifier, index);
  retVal.functionsToProcess!.set(forKey, {
    fn: {
      node,
      parentNode,
      context: forContext,
    },
    args: [`${itemsName}: typeof ${iterableExpr}`, `${counterName}: number`]
  });

  retVal.code.push(`const ${forKey}_${itemsName} = ${iterableExpr}`);
  retVal.code.push(`const ${forKey}_${node.itemAlias} = ${resolveExpression(node.trackExpression, forContext, { skipResolution: true, resolver: `${iterableExpr}` })}`);

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