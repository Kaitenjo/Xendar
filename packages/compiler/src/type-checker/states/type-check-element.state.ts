import { CompilerContext } from '../../generator/models/compiler-context.model';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks an element node: its attribute/property bindings, its event
 * handlers, and recursively its children.
 *
 * No variable is declared for the element itself (see the module doc on
 * `TypeChecker` for why) — attribute expressions and event calls are
 * emitted as bare statements, validated in place.
 */
export function typeCheckElement(node: ElementNode, processNode: ProcessNode, context: TypeCheckContext): string[] {
  const lines = new Array<string>();

  node.attributes.forEach(({ value }) => {
    if (typeof value !== 'string') {
      lines.push(`${resolveExpression(value.expression, context, { resolver: 'root' })};`);
    }
  });

  
  node.events.forEach(({ handler, parameters }) => {
    const eventContext = new CompilerContext([], context);
    eventContext.addUnresolvableIdentifier('$event');

    const args = parameters
      .map(parameter => resolveExpression(parameter, eventContext, { resolver: 'root' }))
      .join(', ');
    
    lines.push(`root.${handler}(${args});`);
  });

  node.children.forEach(child => lines.push(...processNode(child, context)));

  return lines;
}