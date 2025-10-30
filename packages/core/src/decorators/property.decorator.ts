import { ClassAccessorDecorator, ClassAccessorDecoratorValue } from "@xendar/common";
import { INTERNAL_OBSERVED_ATTRIBUTES, INTERNAL_PREFIX } from "../costants";
import { BaseWebComponent } from "../directives/base-web-component";
import { PropertyDecoratorParams } from "../models/property-decorator-params.type";

export function Property<
  Class extends BaseWebComponent,
  Field
  >(params?: PropertyDecoratorParams) {
  return function (_value: ClassAccessorDecoratorValue<Field>, context: ClassAccessorDecoratorContext<Class, Field>): ReturnType<ClassAccessorDecorator<Class, Field>> {
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

        if (params?.required && !value) {
          throw new Error(`Property "${propertyKey}" is required, current value: ${value}`);
        }

        const oldValue = classInstance[internalPropertyKey]!;
        if (oldValue !== value) {
          classInstance[internalPropertyKey] = value;
          classInstance.internalRender();
        }
      },
      init(initialValue: Field) {
        const classInstance = (this as BaseWebComponent & Record<typeof internalPropertyKey, Field>);
        classInstance[internalPropertyKey] = initialValue;
        return initialValue;
      }
    };
  }
}
