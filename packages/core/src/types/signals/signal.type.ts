/**
 * A writable reactive value.
 *
 * Wraps {@link Signal.State} and is also callable as a function to set a new
 * value directly.
 *
 * @template Value - The type of the stored value. Defaults to `any`.
 */
export type Signal<Value = any> = Signal.State<Value> & {
  /**
   * Sets a new value for the signal.
   *
   * @param value - The new value to store.
   */
  (value: Value): void;
  /**
   * Updates the signal value based on its previous value.
   *
   * @param updater - Function receiving the previous value and returning the next one.
   */
  update(updater: (prev: Value) => Value): void;
} 