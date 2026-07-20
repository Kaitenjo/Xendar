import { resolveExpression } from '../../generator/utils/generator.utils';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks an element node: its attribute/property bindings, its event
 * handlers, and recursively its children.
 *
 * No variable is declared for the element itself (see the module doc on
 * `TypeChecker` for why) — attribute expressions and event calls are
 * emitted as bare statements, validated in place.
 */
export function typeCheckElement(node: ElementNode, processNode: ProcessNode): string[] {
  const lines: string[] = [];

  node.attributes.forEach(({ value }) => {
    if (typeof value !== 'string') {
      // A bare expression statement is enough to have TS validate it —
      // no name needs to be bound to it.
      lines.push(`${resolveExpression(value.expression, { resolver: 'root' })};`);
    }
  });

  node.events.forEach(({ handler, parameters }) => {
    const args = parameters
      .map(parameter => resolveExpression(parameter, { resolver: 'root' }))
      .join(', ');

    // Calling the real handler with the real (resolved) arguments checks
    // both that the handler exists and that the argument types line up —
    // no need for an arrow-function wrapper that's never actually invoked.
    lines.push(`root.${handler}(${args});`);
  });

  node.children.forEach((child, i) => {
    lines.push(...processNode(child));
  });

  return lines;
}