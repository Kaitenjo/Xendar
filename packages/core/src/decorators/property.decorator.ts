import { ClassAccessorDecorator, ClassAccessorDecoratorValue } from "@xendar/common";
import { INTERNAL_OBSERVED_ATTRIBUTES, INTERNAL_PREFIX } from "../costants";
import { BaseWebComponent } from "../directives/base-web-component";

export function Property<
  Class extends BaseWebComponent,
  Field
>(_value: ClassAccessorDecoratorValue<Field>, context: ClassAccessorDecoratorContext<Class, Field>): ReturnType<ClassAccessorDecorator<Class, Field>> {
  context.metadata![INTERNAL_OBSERVED_ATTRIBUTES] ??= new Array<string>;
  (context.metadata![INTERNAL_OBSERVED_ATTRIBUTES] as string[]).push(context.name as string);

  const propertyKey = context.name as string;
  const internalPropertyKey = `${INTERNAL_PREFIX}${propertyKey}`
  
  return {
    get() {
      const classInstance = (this as BaseWebComponent & Record<typeof internalPropertyKey, Field>);
      return classInstance[`${INTERNAL_PREFIX}${propertyKey}`]!;
    },
    set(value: Field) {
      const classInstance = (this as BaseWebComponent & Record<typeof internalPropertyKey, Field>);
      const oldValue = classInstance[internalPropertyKey]!;
      if (oldValue !== value) {
        classInstance[internalPropertyKey] = value;
        classInstance.render();
      }
    },
    init(initialValue: Field) {
      return initialValue;
    }
  };
}