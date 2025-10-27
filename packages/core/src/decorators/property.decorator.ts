import { Constructor, FieldDecorator } from "@xendar/common";
import { BaseWebComponent } from "../directives/base-web-component";

export function Property<Class extends BaseWebComponent>(_value: undefined, context: ClassFieldDecoratorContext<Class, unknown>): ReturnType<FieldDecorator<Class, any>> {
  return function (_value: any): void {
    const klass = context.constructor as Constructor<Class>;
    const propertyKey = context.name as string;
    Object.defineProperty(klass, propertyKey, {
      get() {
        return this[`__${propertyKey}`];
      },
      set(value) {
        const old = this[`__${propertyKey}`];
        if (old === value) return;
        this[`__${propertyKey}`] = value;
      }
    });
  };
}