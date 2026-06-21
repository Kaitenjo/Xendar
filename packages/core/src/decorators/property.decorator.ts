import { AccessorDecorator, ClassAccessorDecoratorValue } from '@xaendar/types';
import { INTERNAL_OBSERVED_ATTRIBUTES } from '../costants';
import { BaseWebComponent } from '../directives/base-web-component';
import { input } from '../signals/input/input';
import { PropertyDecoratorOptions, PropertyDecoratorOptionsWithRequired, } from '../types/property-decorator-options.type';
import { InputSignal } from '../types/signals/input-signal.type';

const propertyDecoratorOptionsWithRequiredBrand = Symbol('PropertyDecoratorOptionsWithRequiredBrand');
type PropertyDecoratoprOptionsWithRequiredBrandType<ActualValue = unknown, IncomingValue = ActualValue> = PropertyDecoratorOptionsWithRequired<ActualValue, IncomingValue> & { 
  [propertyDecoratorOptionsWithRequiredBrand]: 'PropertyDecoratorOptionsWithRequired' 
};

function createPropertyDecorator<
  Class extends BaseWebComponent,
  Value extends InputSignal<ActualValue, IncomingValue>,
  ActualValue = unknown,
  IncomingValue = ActualValue
>(value?: ActualValue | PropertyDecoratoprOptionsWithRequiredBrandType<ActualValue, IncomingValue>, options?: PropertyDecoratorOptions<ActualValue, IncomingValue>): AccessorDecorator<Class, Value> {
  return function (
    _target: ClassAccessorDecoratorValue<Value>,
    context: ClassAccessorDecoratorContext<Class, Value>
  ): ReturnType<AccessorDecorator<Class, Value>> {
    const propertyKey = context.name;

    if (typeof propertyKey === 'symbol') {
      throw new Error('Symbol properties are not supported');
    }

    const metadata = context.metadata as { [INTERNAL_OBSERVED_ATTRIBUTES]?: string[] };
    metadata[INTERNAL_OBSERVED_ATTRIBUTES] ??= [];
    metadata[INTERNAL_OBSERVED_ATTRIBUTES].push(propertyKey);

    let actualValue: ActualValue | undefined;
    let actualOptions: PropertyDecoratorOptions<ActualValue, IncomingValue> | undefined | PropertyDecoratoprOptionsWithRequiredBrandType<ActualValue, IncomingValue> | undefined;
    if (!value || typeof value !== 'object' || !(propertyDecoratorOptionsWithRequiredBrand in value)) {
      actualValue = value;
      actualOptions = options;
    } else {
      actualOptions = value;
    }

    const signal = input<ActualValue, IncomingValue>(actualValue, {
      equals: actualOptions?.equals,
      watched: actualOptions?.watched,
      unwatched: actualOptions?.unwatched,
      transform: actualOptions?.transform
    });

    return {
      get() {
        return signal as Value;
      },
      init(_?: InputSignal<ActualValue, IncomingValue>) {
        return signal as Value;
      },
    };
  };
}

/**
 * Decorator that declares an optional input property on a web component.
 *
 * Transforms the decorated accessor into a reactive {@link InputSignal}
 * bound to the corresponding HTML attribute. An optional default `value`
 * and further configuration can be supplied via `options`.
 *
 * @param value - Optional default value for the property.
 * @param options - Additional configuration (equality function, lifecycle
 *   hooks, attribute alias, transform function).
 * @returns An accessor decorator that replaces the field with an `InputSignal`.
 *
 * @example
 * ```ts
 * @Property()
 * accessor label: InputSignal<string>;
 *
 * @Property(0)
 * accessor count: InputSignal<number>;
 * ```
 */
export function Property<
  Class extends BaseWebComponent,
  Value extends InputSignal<ActualValue, IncomingValue>,
  ActualValue = Value extends InputSignal<infer U, any> ? U : unknown,
  IncomingValue = Value extends InputSignal<any, infer V> ? V : ActualValue
>(
  value?: ActualValue,
  options?: PropertyDecoratorOptions<ActualValue, IncomingValue>
): AccessorDecorator<Class, InputSignal<ActualValue, IncomingValue>> {
  return createPropertyDecorator<Class, InputSignal<ActualValue, IncomingValue>, ActualValue, IncomingValue>(value, options);
}

/**
 * Decorator that declares a required input property on a web component.
 *
 * The consumer must explicitly supply the attribute value; no default is
 * accepted. If the attribute is absent, the signal value will be `undefined`
 * and any transform or default handling is the responsibility of the consumer.
 *
 * @param options - Optional configuration (equality function, lifecycle
 *   hooks, attribute alias, transform function). The `required` flag is
 *   added automatically.
 * @returns An accessor decorator that replaces the field with an `InputSignal`.
 *
 * @example
 * ```ts
 * @Property.required()
 * accessor userId: InputSignal<string>;
 *
 * @Property.required({ alias: 'user-id' })
 * accessor userId: InputSignal<string>;
 * ```
 */
Property.required = function required<
  Class extends BaseWebComponent,
  ActualValue = unknown,
  IncomingValue = ActualValue
>(
  options?: Omit<PropertyDecoratorOptionsWithRequired<ActualValue, IncomingValue>, 'required'>
): AccessorDecorator<Class, InputSignal<ActualValue, IncomingValue>> {
  return createPropertyDecorator<Class, InputSignal<ActualValue, IncomingValue>, ActualValue, IncomingValue>({
    ...options,
    [propertyDecoratorOptionsWithRequiredBrand]: 'PropertyDecoratorOptionsWithRequired',
    required: true,
  });
};