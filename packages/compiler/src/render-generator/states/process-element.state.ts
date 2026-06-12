import { AttributeNode } from '../../parser/types/nodes/attribute-node.type';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { EventNode } from '../../parser/types/nodes/event-node.type';
import { Context } from '../models/render-context.model';
import { processNode } from '../render-generator';
import { resolveExpression } from '../utils/render-generator.utils';

/**
 * Generates code for an HTML element node: creates the DOM element, sets attributes,
 * attaches event listeners, appends it to the parent, and recursively processes children.
 *
 * @param node The `ElementNode` to process.
 * @param nodeName Variable name to use for the created DOM element.
 * @param parentNode Variable name of the parent DOM node to append to.
 * @param context Current render scope context.
 * @returns Array of generated code lines.
 */
export function processElement(node: ElementNode, nodeName: string, parentNode: string, context: Context): string[] {
  const childrenContext = new Context([], context);
  const tagName = node.tagName;

  return [
    `const ${nodeName} = document.createElement("${tagName}");`,
    ...(mapAttributes(node.attributes, nodeName, context)),
    ...(mapEvents(node.events, nodeName)),
    `${parentNode}.appendChild(${nodeName});`,
    `unwatchFns.push(() => ${parentNode}.removeChild(${nodeName}));`,
    ...(node.children.map((child, i) => processNode(child, i.toString(), nodeName, childrenContext)).flat())
  ];
}

/**
 * Generates code that assigns attributes to a DOM element.
 *
 * Static (string) attribute values are set once via a direct `setAttribute` call,
 * while dynamic attribute values are wrapped in an `effect` so the attribute is
 * re-evaluated and updated whenever its underlying signal dependencies change.
 * The disposer returned by the `effect` is registered in `unwatchFns` for cleanup.
 *
 * @param attributes The attribute nodes to map onto the element.
 * @param nodeName Variable name of the DOM element receiving the attributes.
 * @param context Current render scope context, used to resolve dynamic expressions.
 * @returns Array of generated code lines, one per attribute.
 */
function mapAttributes(attributes: AttributeNode[], nodeName: string, context: Context): string[] {
  return attributes?.map(attr => {
    const value = attr.value;
    return typeof value === "string"
      ? `${nodeName}.setAttribute('${attr.name}', ${value});`
      : `unwatchFns.push(effect(() => ${nodeName}.setAttribute('${attr.name}', ${resolveExpression(value.expression, context)})));`
  }) ?? [];
}

/**
 * Generates code that attaches event listeners to a DOM element.
 *
 * For each event node an `addEventListener` call is emitted, binding the event
 * to the component instance handler and exposing the native event as `$event`.
 *
 * @param events The event nodes to bind to the element.
 * @param nodeName Variable name of the DOM element receiving the listeners.
 * @returns Array of generated code lines, one per event listener.
 */
function mapEvents(events: EventNode[], nodeName: string): string[] {
  return events?.map(event => `${nodeName}.addEventListener("${event.name}", ($event) => this.${event.handler});`) ?? [];
}
