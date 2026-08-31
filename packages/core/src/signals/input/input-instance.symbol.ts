import { InputSignal } from '../types/input-signal.type';

/**
 * Unique symbol used to mark an object as a valid `InputSignal` instance.
 *
 * Set to `true` on every `InputSignal` created by the `input()` factory.
 * Used by {@link isInputSignal} to distinguish input signals from plain
 * `Signal.State` instances at runtime without exposing the marker in the
 * public API.
 *
 * @internal
 */
export const INPUT_SIGNAL_INSTANCE_SYMBOL = Symbol(`InputSignalInstance`);

/**
 * Type guard that checks whether a given value is an `InputSignal` instance.
 *
 * Inspects the presence of {@link INPUT_SIGNAL_INSTANCE_SYMBOL} on the object,
 * which is set to `true` by the `input()` factory for every valid instance.
 *
 * @param instance - The value to inspect.
 * @returns `true` if `instance` is an `InputSignal`, `false` otherwise.
 */
export function isInputSignal(instance: any): instance is InputSignal & { set: (newValue: unknown, symbol: symbol) => void } {
  return instance?.[INPUT_SIGNAL_INSTANCE_SYMBOL];
}