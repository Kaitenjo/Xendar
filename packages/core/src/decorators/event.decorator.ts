import { AccessorDecorator, ClassAccessorDecoratorValue } from '@xaendar/types';
import { BaseWebComponent } from '../directives/base-web-component';
import { EventOptions } from '../types/event/event-options.type';
import { Output } from '../types/event/output.type';

function isEventOptions(value: EventOptions | unknown): value is EventOptions {
  return !!value && typeof value === 'object' && ('bubbles' in value || 'cancelable' in value || 'composed' in value);
}

/**
 * Decorator that declares a custom event output on a web component.
 *
 * Transforms the decorated accessor into an {@link Output} object whose
 * `emit` method dispatches a `CustomEvent` on the host element. The event
 * name is derived from the accessor name, and the provided `options`
 * (bubbles, cancelable, composed) are used as defaults that can be
 * overridden per-emission.
 *
 * @param options - Default `CustomEvent` options for every emission. At
 *   least one of `bubbles`, `cancelable`, or `composed` must be specified.
 * @returns An accessor decorator that replaces the field with an `Output`.
 *
 * @example
 * ```ts
 * @Event({ bubbles: true })
 * accessor clicked: Output<MouseEvent>;
 * ```
 */
export function Event<
  Class extends BaseWebComponent,
  Data = void,
>(options?: EventOptions): AccessorDecorator<Class, Output<Data>> {
  return (_value: ClassAccessorDecoratorValue<Output<Data>>, context: ClassAccessorDecoratorContext<Class, Output<Data>>): ReturnType<AccessorDecorator<Class, Output<Data>>> => {
    const name = context.name;
    let dispatchEvent: EventTarget['dispatchEvent'];

    context.addInitializer(function (this: Class) {
      dispatchEvent = this.dispatchEvent.bind(this);
    });

    if (typeof name === 'symbol') {
      throw new Error('Symbol properties are not supported as event names');
    }

    const output: Output<Data> = {
      emit: (_valueOrOverrideOptions?: Data | EventOptions, _overrideOptions?: EventOptions) => { }
    };

    return {
      get(): Output<Data> {
        output.emit = function (this: Class, valueOrOverrideOptions?: Data | EventOptions, overrideOptions?: EventOptions) {
          let eventOptions: CustomEventInit<Data> = {};

          eventOptions = isEventOptions(valueOrOverrideOptions)
            ? { ...options, ...valueOrOverrideOptions }
            : { ...options, ...overrideOptions, detail: valueOrOverrideOptions }

          const event = new CustomEvent(name, eventOptions);
          dispatchEvent(event);
        };
        return output;
      }
    }
  }
}
