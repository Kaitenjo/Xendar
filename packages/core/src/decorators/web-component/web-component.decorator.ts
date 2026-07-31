import { ClassDecorator, Constructor } from '@xaendar/types';
import { INTERNAL_OBSERVED_ATTRIBUTES } from '../../costants';
import { BaseWebComponent } from '../../directives/base-web-component';
import { WebComponentDecoratorParams } from '../../types/web-component/web-component-decorator-params.type';

/**
 * Decorator that registers a class as a custom web component.
 *
 * Automatically defines the `observedAttributes` static getter on the class
 * from metadata populated by `@Property` decorators, and registers the
 * component with the browser's Custom Elements registry under the given
 * selector(s).
 *
 * @param options - Configuration object containing at least a `selector`
 *   (the custom element tag name) and a `templateUrl`.
 * @returns A class decorator applied to the web component class.
 *
 * @example
 * ```ts
 * @WebComponent({ selector: 'my-button', templateUrl: './my-button.html' })
 * class MyButtonComponent extends BaseWebComponent {}
 * ```
 */
export function WebComponent<T extends BaseWebComponent>(options: WebComponentDecoratorParams): ClassDecorator<T> {
  return function (klass: Constructor<T>, context: ClassDecoratorContext<Constructor<T>>): void {
    defineObservedAttributes(klass, context);
    setSelectors(klass, options.selector);
  };
}

/**
 * Defines the `observedAttributes` static getter on a web component class
 * using metadata collected by `@Property` decorators.
 *
 * Defined programmatically to avoid requiring each component class to
 * manually re-declare the static property, and to prevent subclasses from
 * accidentally clobbering each other's attribute lists.
 *
 * @param klass - The web component class to augment.
 * @param context - The class decorator context providing access to the
 *   shared metadata object.
 */
function defineObservedAttributes<T extends BaseWebComponent>(klass: Constructor<T>, context: ClassDecoratorContext<Constructor<T>>): void {
  Object.defineProperty(klass, 'observedAttributes', {
    get: () => context.metadata![INTERNAL_OBSERVED_ATTRIBUTES],
    configurable: false,
    enumerable: false
  });
}

/**
 * Registers the component class in the browser's Custom Elements registry
 * under the given selector(s).
 *
 * @param klass - The web component class to register.
 * @param selectors - One or more custom element tag names to associate with the class.
 */
function setSelectors<T extends BaseWebComponent>(klass: Constructor<T>, selectors: string | string[]): void {
  if (typeof selectors === 'string') {
    customElements.define(selectors, klass);
  } else {
    for (let i = 0; i < selectors.length; i++) {
      customElements.define(selectors[i], klass)
    }
  } 
}