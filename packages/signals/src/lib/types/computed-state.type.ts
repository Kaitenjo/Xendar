/**
 * Represents the state of a computed signal. 
 * The state can be one of the following:
 * - `dirty`: the computed signal is dirty and needs to be recomputed.
 * - `checked`: the computed signal is checked and needs to be recomputed.
 * - `computing`: the computed signal is currently being computed.
 * - `clean`: the computed signal is clean and does not need to be recomputed.
 */
export type ComputedState = 'dirty' | 'checked' | 'computing' | 'clean';