import { ClassDecorator, Constructor } from "@xendar/common";
import { BaseWebComponent } from "../directives/base-web-component";
import { INTERNAL_OBSERVED_ATTRIBUTES, INTERNAL_PREFIX } from "../costants";

/**
 * Decorator to define a web component
 * @param selector Name or names of the custom element
 */
export function WebComponent<T extends BaseWebComponent>(selector: string | string[]): ClassDecorator<T> {
  return function (klass: Constructor<T>, context: ClassDecoratorContext<Constructor<T>>): void {
    defineObservedAttributes(klass, context);
    setSelectors(klass, selector);
  };
}

/**
 * Function to define the observedAttributes static property on the class.
 * We define static get observedAttributes programmatically
 * to abstract the manual definition from the user.
 *
 * We could not define the property in the base class due to the fact
 * that is static and each derived class would override the value of the others
 * @param klass The class to set the observedAttributes on
 * @param attributes The attributes to observe
 */
function defineObservedAttributes<T extends BaseWebComponent>(klass: Constructor<T>, context: ClassDecoratorContext<Constructor<T>>): void {
  Object.defineProperty(klass, 'observedAttributes', {
    get: () => context.metadata![INTERNAL_OBSERVED_ATTRIBUTES]
  });
}

/**
 * Function to add the custom element definition to the browser using the passed selectors.
 * @param klass The class to define as a web component
 * @param selectors The selector or selectors to reference the web component in HTML
 */
function setSelectors<T extends BaseWebComponent>(klass: Constructor<T>, selectors: string | string[]): void {
  Array.isArray(selectors)
    ? selectors.forEach(selector => customElements.define(selector, klass))
    : customElements.define(selectors, klass);
}