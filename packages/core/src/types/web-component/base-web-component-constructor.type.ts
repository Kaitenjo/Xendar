import { Constructor } from '@xaendar/types';
import { BaseWebComponent } from '../../directives/base-web-component';

/**
 * Constructor type for classes that extend {@link BaseWebComponent}.
 *
 * Includes the static `observedAttributes` array required by the Custom
 * Elements API to register attribute change callbacks.
 */
export type BaseWebComponentConstructor = Constructor<BaseWebComponent, {
  observedAttributes: string[]
}>;