import { effect } from '../signals/effect/effect';
import { RenderElementAttribute } from '../types/render-element-attribute.type';
import { RenderElementEvent } from '../types/render-element-event.type';
import { Context } from './context.util';

/**
 * Creates a DOM element, applies attributes and event listeners, appends it
 * to the parent, and registers cleanup functions in the current context.
 *
 * Static (literal) attribute values are set once via `setAttribute`. Dynamic
 * attribute values are wrapped in a reactive `effect` so they update
 * automatically whenever the underlying signal changes. Event listeners are
 * attached with `addEventListener` and the corresponding `removeEventListener`
 * is registered as a cleanup function.
 *
 * @param parentNode - The parent HTML element to append the new element to.
 * @param context - The current template execution scope.
 * @param tagName - The HTML tag name of the element to create.
 * @param attributes - List of attribute descriptors to apply to the element.
 * @param events - List of event listener descriptors to attach to the element.
 * @returns The newly created HTML element.
 */
export function _renderElement(parentNode: HTMLElement, context: Context, tagName: string, attributes: RenderElementAttribute[], events: RenderElementEvent[]): HTMLElement {
  const element = document.createElement(tagName);
  parentNode.appendChild(element);
  context.listen(() => {
    context.removeNode(element);
    parentNode.removeChild(element)
  })

  attributes.forEach(({ name, value, literal } )=> {
    literal
      ? element.setAttribute(name, String(value()))
      : context.listen(effect(() => element.setAttribute(name, String(value()))))
  });

  events.forEach(event => {
    // TODO: Support params args
    const handler = ($event: Event) => context.getEventHandler(event.handler)();
    const name = event.name;
    element.addEventListener(name, handler);
    context.listen(() => element.removeEventListener(name, handler))
  });

  return element;
}