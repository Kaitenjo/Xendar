import { ClassDecorator, Constructor } from "@xendar/common";
import { WEB_COMPONENT_PREFIX } from "../constants/web-component-prefix";
import { BaseWebComponent } from "../directives/base-web-component";

/**
 * Decorator to define a web component
 * @param selector Name or names of the custom element
 */
export function WebComponent<T extends BaseWebComponent>(selector: string | string[]): ClassDecorator<T> {
  return function (klass: Constructor<T>, _context: ClassDecoratorContext): void {
    Reflect.set(klass, `${WEB_COMPONENT_PREFIX}selector`, selector);
  };
}
