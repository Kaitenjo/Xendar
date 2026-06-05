import { indent } from '../../../../common/src/utils/index.js';
import { ElementNode } from '../../parser/types/nodes/element-node.type.js';
import { Context } from '../models/render-context.model.js';
import { processNode } from '../render-generator.js';
import { getElementIdentifier, resolveExpression } from '../utils/render-generator.utils.js';

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
    ...(node.attributes?.map(attr => {
      const value = attr.value;
      return typeof value === "string"
        ? `${nodeName}.setAttribute('${attr.name}', ${value});`
        : `unwatchFns.push(effect(() => ${nodeName}.setAttribute('${attr.name}', ${resolveExpression(value.expression, context)})));`
    }) || []),
    ...(node.events?.map(event => `${nodeName}.addEventListener("${event.name}", ($event) => this.${event.handler});`) || []),
    `${parentNode}.appendChild(${nodeName});`,
    `unwatchFns.push(() => ${parentNode}.removeChild(${nodeName}));`,
    ...(node.children.map((child, i) => processNode(child, i.toString(), nodeName, childrenContext)).flat())
  ];
}
