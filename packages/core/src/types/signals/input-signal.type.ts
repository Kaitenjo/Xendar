import { InputSignalOptions } from './input-signal.options.type';

/**
 * A reactive value sourced from outside the component (e.g. an attribute).
 *
 * Wraps {@link Signal.State} without its `set` method (inputs are not set
 * directly) and is callable as a function to read the current value. An
 * optional {@link InputSignalOptions.transform} can convert the incoming value
 * into the actual stored value.
 *
 * @template ActualValue - The internal type stored by the signal. Defaults to `unknown`.
 * @template IncomingValue - The raw type received from outside. Defaults to `ActualValue`.
 */
export type InputSignal<ActualValue = unknown, IncomingValue = ActualValue> = Omit<Signal.State<ActualValue>, 'set'> & {
  /**
   * Reads the current value of the input signal.
   *
   * @returns The current value of type `ActualValue`.
   */
  (): ActualValue;
  /**
   * Creates a new input signal.
   *
   * @param value - The initial incoming value.
   * @param options - Optional configuration, including a `transform` function.
   */
  new (value: IncomingValue, options?: InputSignalOptions<ActualValue, IncomingValue>): InputSignal<ActualValue, IncomingValue>;
};