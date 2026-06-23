import { indent } from '@xaendar/common';
import { AttributeNode } from '../../parser/types/nodes/attribute-node.type';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { EventNode } from '../../parser/types/nodes/event-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { processNode } from '../render-generator';
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
  const events = mapEvents(node.events, compilerContext);
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
    ');'
  )
  : code[code.length - 1] = `${code[code.length - 1]} []);`;
  
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
 * @param compilerContext - Current render scope context, used to resolve identifier references.
 * @returns Array of generated code lines, one per event listener.
 */
function mapEvents(events: EventNode[], compilerContext: CompilerContext): string[] {
  compilerContext.addIdentifier('$event');

  const mappedEvents = events?.map(event => {
    const parameters = event.parameters.map(parameter => `() => ${resolveExpression(parameter, compilerContext)}`);
    return `{ name: '${event.name}', handler: '${event.handler}', parameters: ${parameters.join(', ')}} }`
  });

  compilerContext.removeIdentifier('$event');
  return mappedEvents;
}
