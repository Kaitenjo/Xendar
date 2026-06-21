import { VoidFunction } from '@xaendar/types';
import { EventOptions } from './event-options.type';

/**
 * Represents the output type returned by an `@Event` decorator in a web component.
 *
 * The `emit` method dispatches a `CustomEvent` with the specified value and
 * options. Any options passed to `emit` override the defaults configured in
 * the decorator.
 *
 * @template Value - The type of the value to emit as the event detail. Defaults to `void`.
 */
export type Output<Value = void> = {
  emit: VoidFunction<Value extends void ? ([EventOptions] | []) : ([Value, EventOptions] | [Value])>;
}