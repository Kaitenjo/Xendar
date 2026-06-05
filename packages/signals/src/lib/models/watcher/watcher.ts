import { NoArgsVoidFunction } from '@xaendar/types';
import { GLOBAL_STATE } from '../../utils/globals/globals';
import { PRIVATE, assertPrivateContext } from '../../utils/private-symbol/private-symbol';
import { State } from '../state/state';
import { WatcherState } from '../../types/watcher-state.type';
import { Computed } from '../computed/computed';
import { isDevMode } from '../../utils/dev-mode/dev-mode';

/**
 * A `Watcher` observes a set of Signals and fires a `notify` callback
 * synchronously when any of their (recursive) dependencies change.
 *
 * It is the low-level primitive on top of which frameworks implement
 * effects and scheduling. It does not hold a value and has no generic
 * type parameter.
 *
 * @see Signal algorithms — 'The `Signal.subtle.Watcher` class'
 */
export class Watcher {
  /**
   * The current state of the Watcher.
   *
   * - `~waiting~`  — newly created, or `notify` has already been called since
   *                  the last `watch` call. Not actively observing changes.
   * - `~watching~` — actively watching; no dependency has changed yet.
   * - `~pending~`  — a dependency has changed but `notify` has not yet run.
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.subtle.Watcher State machine'
   */
  #state: WatcherState;
  /**
   * The ordered set of Signals this Watcher is currently watching.
   * May contain both `State` and `Computed` instances.
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.subtle.Watcher internal slots'
   */
  #signals: Set<State<unknown> | Computed<unknown>>;
  /**
   * Returns a snapshot of the current watched signals set for introspection.
   *
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @returns An array of `State` and `Computed` instances that this Watcher is watching.
   * @internal
   */
  public getSources(symbol: symbol): (State<unknown> | Computed<unknown>)[] {
    assertPrivateContext(symbol);
    return [...this.#signals];
  }
  /**
   * The callback invoked synchronously when a watched Signal (or one of its
   * recursive dependencies) changes for the first time since the last
   * `watch` call.
   *
   * Receives the Watcher itself as `this`. No Signals may be read or written
   * during its execution (`frozen` is `true` for its entire duration).
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.subtle.Watcher internal slots'
   */
  #notifyCallback: NoArgsVoidFunction;

  /**
   * Creates a new Watcher.
   *
   * The Watcher starts in the `~waiting~` state with an empty signals set.
   *
   * @param notifyCallback - Called synchronously (with `frozen = true`) the
   * first time a watched dependency changes after each `watch` call. No
   * Signals may be read or written inside this callback.
   *
   * @see Signal algorithms — 'Constructor: new Signal.subtle.Watcher(callback)'
   */
  constructor(notifyCallback: NoArgsVoidFunction) {
    this.#state = 'waiting';
    this.#signals = new Set;
    this.#notifyCallback = notifyCallback;
  }

  /**
   * Returns the subset of watched Signals that are `Computed` instances
   * currently in a `~dirty~` or `~checked~` state, meaning they may have a
   * stale value that has not yet been re-evaluated.
   *
   * Typically called inside the microtask scheduled by the `notify` callback
   * to know which Signals need to be pulled.
   *
   * @returns An array of `Computed` signals that are dirty or checked.
   *
   * @see Signal algorithms — 'Method: Signal.subtle.Watcher.prototype.getPending()'
   */
  public getPending(): Computed<unknown>[] {
    return [...this.#signals].filter((signal): signal is Computed<unknown> => {
      if (!(signal instanceof Computed)) {
        return false;
      }

      const state = signal.getState(PRIVATE);
      return state === 'dirty' || state === 'checked';
    });
  }

  /**
   * Adds the given Signals to the watched set and transitions the Watcher to
   * the `~watching~` state.
   *
   * For each newly-watched Signal, the Watcher is registered as a sink and —
   * if it is the first sink — the sink registration is propagated recursively
   * up through the Signal's sources, building the live dependency chain.
   *
   * The `watched` callback of each Signal (if any) is called with
   * `frozen = true`.
   *
   * @param signals - One or more `State` signals to start watching.
   * @throws If `frozen` is `true` at the time of the call.
   *
   * @see Signal algorithms — 'Method: Signal.subtle.Watcher.prototype.watch(...signals)'
   */
  public watch(...signals: (State | Computed)[]) {
    if (GLOBAL_STATE.frozen) {
      throw new Error('Cannot watch signals while frozen');
    }

    signals.forEach(signal => {
      if (this.#signals.has(signal)) {
        throw new Error('Cannot watch a signal that is already being watched');
      }

      this.#signals.add(signal)
      signal.addSink(this, PRIVATE);
    });


    this.setState('watching', PRIVATE);
  }

  /**
   * Removes the given Signals from the watched set.
   *
   * For each removed Signal, the Watcher is unregistered as a sink. If the
   * Signal's sink set becomes empty as a result, the removal is propagated
   * recursively up through its sources, tearing down the live dependency
   * chain and allowing garbage collection of unwatched nodes.
   *
   * The `unwatched` callback of each Signal (if any) is called with
   * `frozen = true`.
   *
   * If no Signals remain in the watched set, the Watcher transitions back to
   * the `~waiting~` state.
   *
   * @param signals - One or more `State` signals to stop watching.
   * @throws If `frozen` is `true` at the time of the call.
   * @throws If any of the given Signals is not currently being watched.
   *
   * @see Signal algorithms — 'Method: Signal.subtle.Watcher.prototype.unwatch(...signals)'
   */
  public unwatch(...signals: (State | Computed)[]) {
    if (GLOBAL_STATE.frozen) {
      throw new Error('Cannot unwatch signals while frozen');
    }

    signals.forEach(signal => {
      if (!this.#signals.has(signal)) {
        throw new Error('Cannot unwatch a signal that is not being watched');
      }

      this.#signals.delete(signal)
      signal.removeSink(this, PRIVATE);
    });

    if (!this.#signals.size) {
      this.setState('waiting', PRIVATE)
    }
  }

  /**
   * Get the current state of the Watcher.
   * @param symbol - The private symbol for prevent external calls.
   */
  public getState(symbol: symbol): WatcherState {
    assertPrivateContext(symbol);
    return this.#state;
  }

  /**
   * Set the current state of the Watcher.
   * @param newState - The new state to set.
   * @param symbol - The private symbol for prevent external calls.
   * @throws If the transition from `pending` to `watching` is attempted.
   */
  public setState(newState: WatcherState, symbol: symbol): void {
    assertPrivateContext(symbol);

    if (this.#state === newState) {
      return;
    }

    if (!this.#isValidTransition(this.#state, newState)) {
      if (isDevMode()) {
        console.warn(`Invalid state transition from ${this.#state} to ${newState} in Watcher`);
        console.warn(new Error().stack)
      }
      return;
    }

    this.#state = newState
  }

  /**
   * Invoce the notify callback when a watched dependency changes
   * @param symbol - The private symbol for prevent external calls.
   */
  public notify(symbol: symbol): void {
    assertPrivateContext(symbol);

    GLOBAL_STATE.frozen = true;

    try {
      this.setState('pending', PRIVATE)
      this.#notifyCallback.call(this);
    } catch (error) {
      // This log is not present in the TC39 spec, could be removed in next versions
      if (isDevMode()) {
        console.error('Error thrown while running a Watcher notify callback:', error);
      }
      throw error;
    } finally {
      this.setState('waiting', PRIVATE);
      GLOBAL_STATE.frozen = false;
    }
  }

  #isValidTransition(from: WatcherState, to: WatcherState): boolean {
    switch (from) {
      case 'waiting':
        return to === 'watching';
      case 'watching':
        return to === 'pending' || to === 'waiting';
      case 'pending':
        return to === 'waiting';
    }
  }
}