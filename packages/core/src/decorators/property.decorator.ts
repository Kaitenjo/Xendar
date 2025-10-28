import { ClassAccessorDecorator, ClassAccessorDecoratorValue, FieldDecorator } from "@xendar/common";
import { INTERNAL_OBSERVED_ATTRIBUTES, INTERNAL_PREFIX } from "../costants";
import { BaseWebComponent } from "../directives/base-web-component";

export function Property<
  Class extends BaseWebComponent,
  Field
>(_value: ClassAccessorDecoratorValue<Field>, context: ClassAccessorDecoratorContext<Class, Field>): ReturnType<ClassAccessorDecorator<Class, Field>> {
  context.metadata![INTERNAL_OBSERVED_ATTRIBUTES] ??= new Array<string>;
  (context.metadata![INTERNAL_OBSERVED_ATTRIBUTES] as string[]).push(context.name as string);

  const propertyKey = context.name as string;

  return {
    get() {
      return (this as any)[`${INTERNAL_PREFIX}${propertyKey}`];
    },
    set(value: Field) {
      const key = `${INTERNAL_PREFIX}${propertyKey}`;
      const oldValue = (this as any)[key];
      if (oldValue !== value) {
        (this as any)[key] = value;
        if (typeof (this as any).render === "function") {
          (this as any).render();
        }
      }
    },
    init(initialValue: Field) {
      return initialValue;
    }
  };
}