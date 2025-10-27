import { FieldDecorator } from "@xendar/common";
import { INTERNAL_OBSERVED_ATTRIBUTES, INTERNAL_PREFIX } from "../costants";
import { BaseWebComponent } from "../directives/base-web-component";

export function Property<
  Class extends BaseWebComponent, 
  Field = unknown
>(_value: undefined, context: ClassFieldDecoratorContext<Class, Field>): ReturnType<FieldDecorator<Class, Field>> {
  context.metadata![INTERNAL_OBSERVED_ATTRIBUTES] ??= new Array<string>;
  (context.metadata![INTERNAL_OBSERVED_ATTRIBUTES] as string[]).push(context.name as string);

  return function (this: Class, value: Field): Field {
    const propertyKey = context.name as string;

    Object.defineProperty(Object.getPrototypeOf(this), propertyKey, {
      get() {
        return this[`${INTERNAL_PREFIX}${propertyKey}`];
      },
      set(value) {
        const old = this[`${INTERNAL_PREFIX}${propertyKey}`];
        if (old !== value) {
          this[`${INTERNAL_PREFIX}${propertyKey}`] = value;
        }
        this.render();
      },
      enumerable: true,
      configurable: true
    });

    return value;
  };
}