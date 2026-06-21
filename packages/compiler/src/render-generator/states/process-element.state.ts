import { Expression, Identifier } from 'typescript';
import { AttributeNode } from '../../parser/types/nodes/attribute-node.type';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { EventNode } from '../../parser/types/nodes/event-node.type';
import { indent } from '@xaendar/common';
import { processNode } from '../render-generator';
import { CompilerContext } from '../models/compiler-context.model';
import { resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for an HTML element node: creates the DOM element, sets attributes,
 * attaches event listeners, appends it to the parent, and recursively processes children.
 *
 * @param node - The `ElementNode` to process.
 * @param nodeName - Variable name to use for the created DOM element.
 * @param parentNode - Variable name of the parent DOM node to append to.
 * @param compilerContext - Current render scope context.
 * @returns Array of generated code lines.
 */
export function processElement(node: ElementNode, nodeName: string, parentNode: string, compilerContext: CompilerContext): string[] {
  const attributes = mapAttributes(node.attributes, compilerContext);
  const events = mapEvents(node.events);
  const code = [`const ${nodeName} = _renderElement(${parentNode}, context, '${node.tagName}',`];

  attributes.length
  ? code.push(
    ...indent([
      '[',
      ...indent(attributes),
      '],'
    ])
  )
  : code[code.length - 1] = `${code[code.length - 1]} [],`;
  
  events.length
  ? code.push(
    ...indent([
      '[',
      ...indent(events),
      ']'
    ]),
    ')'
  )
  : code[code.length - 1] = `${code[code.length - 1]} [])`;
  
  code.push(...node.children.map((child, i) => processNode(child, i.toString(), nodeName, compilerContext)).flat())
  return code;
}

/**
 * Maps attribute nodes to their corresponding generated code lines.
 *
 * @param attributes - The attribute nodes to map onto the element.
 * @param compilerContext - Current render scope context, used to resolve identifier references.
 * @returns Array of generated code strings, one per attribute.
 */
function mapAttributes(attributes: AttributeNode[], compilerContext: CompilerContext): string[] {
  return attributes?.map(({ name, value }) => {
    const isLiteral = typeof value === 'string';
    return `{ name: '${name}', value: () => ${isLiteral ? `'${value}'` : resolveExpression(value.expression, compilerContext)}, literal: ${isLiteral} },`
  })
}

/**
 * Generates code that attaches event listeners to a DOM element.
 *
 * For each event node an `addEventListener` call is emitted, binding the event
 * to the component instance handler and exposing the native event as `$event`.
 *
 * @param events - The event nodes to bind to the element.
 * @returns Array of generated code lines, one per event listener.
 */
function mapEvents(events: EventNode[]): string[] {
  return events?.map(event => `{ name: '${event.name}', handler: '${event.handler}' }`);
}
