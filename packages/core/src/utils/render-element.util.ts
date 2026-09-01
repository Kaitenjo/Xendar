import { NoArgsFunction } from '@xaendar/types';
import { MATHML_NS, SVG_NS } from '../costants';
import { effect } from '../signals/effect/effect';
import { RenderElementAttribute } from '../types/render-element-attribute.type';
import { RenderElementEvent } from '../types/render-element-event.type';
import { Context, mountNode } from './context.util';

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
export function _renderElement(parentNode: Element, context: Context, anchor: Comment | null, tagName: string, attributes: RenderElementAttribute[], events: RenderElementEvent[]): Element {
  const element = context.createElement(tagName);
  mountNode(element, parentNode, context, anchor)

  for (let i = 0; i < attributes.length; i++) {
    const { name, value, setter } = attributes[i];
    setter === bindAttribute ? setter(element, name, value) : setter(context, element, name, value)
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const handler = ($event: Event) => context.getEventHandler(event.handler)(...event.parameters.map(event => event($event)));
    const name = event.name;
    element.addEventListener(name, handler);
    context.listen(() => element.removeEventListener(name, handler))
  }

  return element;
}

/**
 * Creates an HTML element with the specified tag name.
 *
 * @param tagName - The HTML tag name of the element to create.
 * @returns The newly created HTML element.
 */
export function createElement(tagName: string): HTMLElement {
  return document.createElement(tagName);
}

/**
 * Creates an SVG element with the specified tag name using the SVG namespace.
 *
 * @param tagName - The SVG tag name of the element to create.
 * @returns The newly created SVG element.
 */
export function createSVGElement(tagName: string): SVGElement {
  return document.createElementNS(SVG_NS, tagName);
}

/**
 * Creates a MathML element with the specified tag name using the MathML namespace.
 *
 * @param tagName - The MathML tag name of the element to create.
 * @returns The newly created MathML element.
 */
export function createMATHMLElement(tagName: string): MathMLElement {
  return document.createElementNS(MATHML_NS, tagName);
}

/**
 * Sets a static attribute value on an HTML element.
 *
 * @param element - The element to set the attribute on.
 * @param name - The name of the attribute.
 * @param getter - A function that returns the attribute value.
 */
export function bindAttribute(element: Element, name: string, getter: NoArgsFunction<unknown>): void {
  element.setAttribute(name, String(getter()))
}

/**
 * Sets a reactive attribute value on an HTML element that updates automatically
 * whenever the underlying signal changes.
 *
 * @param context - The current template execution scope.
 * @param element - The element to set the attribute on.
 * @param name - The name of the attribute.
 * @param getter - A function that returns the attribute value.
 */
export function bindReactiveAttribute(context: Context, element: Element, name: string, getter: NoArgsFunction<unknown>): void {
  context.listen(effect(() => element.setAttribute(name, String(getter()))))
}