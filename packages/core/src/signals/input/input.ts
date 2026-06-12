import { InputSignalOptions } from '../../types/signals/input-signal.options.type';
import { InputSignal } from '../../types/signals/input-signal.type';
import { assertPrivateContext } from './input-set.symbol';

/**
 * An `InputSignal` is a specialized `Signal.State` designed for use as a property signal in web components. 
 * It extends the base `State` signal with additional functionality to handle incoming values, such as those from HTML attributes or external sources, 
 * and allows for optional transformation of these values before they are stored in the signal.
 */
export function input<ActualValue = unknown, IncomingValue = ActualValue>(value?: ActualValue, options?: InputSignalOptions<ActualValue, IncomingValue>): InputSignal<ActualValue, IncomingValue> {
  const transform = options?.transform;
  delete options?.transform;

  const signal = new Signal.State(value, options);
  const originalSet = signal.set;

  const getter = function () { signal.get(); }
  Object.assign(getter, signal);
  Object.assign(signal, {
    set(newValue: IncomingValue, symbol: symbol): void {
      assertPrivateContext(symbol);
      const transformedValue = transform ? transform(newValue) : newValue;
      originalSet.call(signal, transformedValue as ActualValue);
    }
  });

  return getter as InputSignal<ActualValue, IncomingValue>;
}