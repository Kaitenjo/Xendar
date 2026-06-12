import { SignalOptions } from '@xaendar/signals'

/**
 * Options used to configure an `InputSignal`.
 *
 * Extends {@link SignalOptions} with an optional `transform` function that
 * converts the incoming value (e.g. an attribute string) into the actual
 * internal value stored by the signal.
 *
 * @template ActualValue - The internal type stored by the signal. Defaults to `unknown`.
 * @template IncomingValue - The raw type received from outside (e.g. from an attribute). Defaults to `ActualValue`.
 */
export type InputSignalOptions<ActualValue = unknown, IncomingValue = ActualValue> = SignalOptions<ActualValue> & {
  /**
   * Optional function to transform the incoming value before it is stored.
   *
   * @param value - The raw incoming value.
   * @returns The transformed value of type `ActualValue`.
   */
  transform?: (value: IncomingValue) => ActualValue
}