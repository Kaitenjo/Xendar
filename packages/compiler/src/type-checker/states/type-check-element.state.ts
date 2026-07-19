import { CompilerContext } from "../../generator/models/compiler-context.model";
import { getElementIdentifier, resolveExpression } from "../../generator/utils/generator.utils";
import { ElementNode } from "../../parser/types/nodes/element-node.type";
import { TypeCheckerTransitionFunctionReturnType } from "../types/type-checker-transition-function-return-type.type";

export function typeCheckElement(node: ElementNode, parentNode: { identifier: string, type: string }, index: string, context: CompilerContext): TypeCheckerTransitionFunctionReturnType {
  const nodeName = getElementIdentifier(node, parentNode.identifier, index);
  const retVal: TypeCheckerTransitionFunctionReturnType = {
    code: [`let ${nodeName}!: HTMLElement`],
    functionsToProcess: new Map()
  }
  
  node.attributes.forEach(({ name, value }) => {
    const isLiteral = typeof value === 'string';
    if (!isLiteral) {
      retVal.code.push(`const ${nodeName}_${name} = ${resolveExpression(value.expression, context, { resolver: 'root' })};`);
    }
  });

  context.addUnresolvableIdentifier('$event');
  node.events.forEach(({ name, handler, parameters }) => {
    let parsedEventParameter = false;
    const mappedParameters = parameters.map(parameter => {
      const resolvedParameter = resolveExpression(parameter, context, { resolver: 'root' });
      if (!parsedEventParameter && resolvedParameter === '$event') {
        parsedEventParameter = true;
        return `$event`
      } else {
        return `${resolvedParameter}`
      }
    }).join(', ');
    const beginning = parsedEventParameter ? '($event)' : '()'
    retVal.code.push(`const ${nodeName}_${name} = ${beginning} => root.${handler}(${mappedParameters});`)
  });

  if (node.children.length) {
    retVal.functionsToProcess!.set(`${nodeName}Children`, {
      fn: { 
        node, 
        parentNode: {
          identifier: nodeName,
          type: 'HTMLElement'
        }, 
        context: context,
      }
    });
  }

  return retVal;
}