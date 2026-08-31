import { InputSignalOptions } from '../types/input-signal.options.type';
import { InputSignal } from '../types/input-signal.type';
import { INPUT_SIGNAL_INSTANCE_SYMBOL } from './input-instance.symbol';
import { assertPrivateContext } from './input-set.symbol';

/**
 * Creates an `InputSignal` — a specialized reactive state designed for use
 * as a property signal in web components.
 *
 * Unlike a plain `Signal.State`, the `set` method of an `InputSignal` is
 * restricted to internal callers (identified by the private symbol) and
 * accepts an optional `transform` function that converts incoming values
 * (e.g. raw HTML attribute strings) into the internally stored type before
 * updating the signal.
 *
 * @param value - The initial value of the signal.
 * @param options - Optional configuration including an equality function,
 *   lifecycle hooks, and a `transform` function applied to incoming values.
 * @returns A new `InputSignal` instance.
 */
export function input<ActualValue = unknown, IncomingValue = ActualValue>(value?: ActualValue, options?: InputSignalOptions<ActualValue, IncomingValue>): InputSignal<ActualValue, IncomingValue> {
  const transform = options?.transform;
  delete options?.transform;

  const signal = new Signal.State(value, options);
  const originalSet = signal.set;

  const getter = function () { return signal.get(); }
  Object.assign(getter, {
    set(newValue: IncomingValue, symbol: symbol): void {
      assertPrivateContext(symbol);
      const transformedValue = transform ? transform(newValue) : newValue;
      originalSet.call(signal, transformedValue as ActualValue);
    },
    get: signal.get.bind(signal)
  });
  getter[INPUT_SIGNAL_INSTANCE_SYMBOL] = true;

  return getter as unknown as InputSignal<ActualValue, IncomingValue>;
}