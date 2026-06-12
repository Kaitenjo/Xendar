import { SignalOptions } from '@xaendar/signals';
import { Computed } from '../../types/signals/computed.type';

/**
 * Creates a read-only computed signal.
 *
 * Returns a callable getter that reads the current value, augmented with the
 * underlying {@link Signal.State} API.
 *
 * @template Value - The type of the computed value. Defaults to `any`.
 * @param value - The initial value.
 * @param options - Configuration options for the signal.
 * @returns A {@link Computed} instance.
 */
export function computed<Value = any>(value: Value, options?: SignalOptions<Value>): Computed<Value> {
  const signal = new Signal.State(value, options);
  const getter = function () { return signal.get(); }
  Object.assign(getter, {
    get: signal.get
  });
  return getter as unknown as Computed<Value>;
}