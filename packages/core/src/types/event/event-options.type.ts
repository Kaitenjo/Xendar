import { Beautify, RequireOne } from '@xaendar/types';

/**
 * Represents the options used to configure an `@Event` decorator in a web component.
 *
 * At least one of `bubbles`, `cancelable`, or `composed` must be provided.
 * Mirrors the relevant subset of {@link CustomEventInit}, excluding `detail`
 * which is provided separately when emitting.
 */
export type EventOptions = Beautify<RequireOne<Omit<CustomEventInit, 'detail'>>>;