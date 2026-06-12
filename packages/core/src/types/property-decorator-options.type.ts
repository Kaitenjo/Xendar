import { InputSignalOptions } from './signals/input-signal.options.type';

/**
 * Parameters accepted by the `@property` decorator.
 *
 * Extends {@link InputSignalOptions} with an optional `alias` (the attribute name
 * to observe) and a mandatory `value` (the default value of the property).
 *
 * @template IncomingValue - The raw type received from outside (e.g. from an attribute). Defaults to `ActualValue`.
 * @template ActualValue - The internal type stored by the signal. Defaults to `unknown`.
 */
export type PropertyDecoratorOptions<ActualValue = unknown, IncomingValue = ActualValue> = InputSignalOptions<ActualValue, IncomingValue> & {
  /** 
   * The attribute name to observe. Defaults to the property name when omitted. 
   */
  alias?: string;
}

/**
 * Variant of {@link PropertyDecoratorOptions} that marks the property as required.
 *
 * When `required` is `true`, the component will expect the attribute/input to be
 * explicitly provided by the consumer.
 *
 * @template IncomingValue - The raw type received from outside. Defaults to `ActualValue`.
 * @template ActualValue - The internal type stored by the signal. Defaults to `unknown`.
 */
export type PropertyDecoratorOptionsWithRequired<ActualValue = unknown, IncomingValue = ActualValue> = PropertyDecoratorOptions<ActualValue, IncomingValue> & {
  /**
   * Indicates that the property is required. When `true`, the component will expect the attribute/input to be explicitly provided by the consumer.
   */
  required: true;
}