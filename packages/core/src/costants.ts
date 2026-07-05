/**
 * Metadata key used internally to store the list of observed attribute names
 * on a web component class.
 *
 * Populated by the `@Property` decorator and consumed by `@WebComponent` to
 * define `observedAttributes` on the custom element class.
 *
 * @internal
 */
export const INTERNAL_OBSERVED_ATTRIBUTES = `observedAttributes`;

export const SVG_NS = 'http://www.w3.org/2000/svg';