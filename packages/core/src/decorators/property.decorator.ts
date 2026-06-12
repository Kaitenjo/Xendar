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
 * Decoratore per proprietà opzionale.
 *
 * @example
 * @Property()
 * accessor label: InputSignal<string>;
 *
 * @Property({ value: 0 })
 * accessor count: InputSignal<number>;
 *
 * @Property({ value: { required: true, foo: 'bar' }, alias: 'cfg' })
 * accessor config: InputSignal<Config>;
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
 * Decoratore per proprietà obbligatoria.
 * Il consumer deve fornire il valore; non accetta un valore di default.
 *
 * @example
 * @Property.required()
 * accessor userId: InputSignal<string>;
 *
 * @Property.required({ alias: 'user-id' })
 * accessor userId: InputSignal<string>;
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