import { InputSignal } from '../../types/signals/input-signal.type';

/**
 * This file defines a unique symbol used to identify instances of input signals within the framework.
 * The symbol serves as a marker to ensure that only valid input signal instances are recognized and processed.
 *
 * @internal
 */
export const INPUT_SIGNAL_INSTANCE_SYMBOL = Symbol(`InputSignalInstance`);

/**
 * Type guard function to check if a given instance is an InputSignal.
 * This function checks for the presence of the INPUT_SIGNAL_INSTANCE_SYMBOL on the instance, 
 * which is set to true for valid InputSignal instances.
 * @param instance - The object to check for being an InputSignal instance.
 * @returns A boolean indicating whether the instance is an InputSignal.
 */
export function isInputSignal(instance: any): instance is InputSignal & { set: (newValue: unknown, symbol: symbol) => void } {
  return instance?.[INPUT_SIGNAL_INSTANCE_SYMBOL];
}