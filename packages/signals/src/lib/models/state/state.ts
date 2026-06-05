import { NoArgsVoidFunction } from '@xaendar/types';
import { SignalEqual } from '../../types/signal-equal.type';
import { SignalOptions } from '../../types/signal-options.type';
import { isDevMode } from '../../utils/dev-mode/dev-mode';
import { GLOBAL_STATE } from '../../utils/globals/globals';
import { PRIVATE, assertPrivateContext } from '../../utils/private-symbol/private-symbol';
import { Computed } from '../computed/computed';
import { Watcher } from '../watcher/watcher';

export class State<T = any> {
  /**
   * The current value of the signal.
   *
   * Initialised to `initialValue` in the constructor and updated by `set`
   * whenever the new value is not equal to the current one according to
   * `#equals`.
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.State internal slots'
   */
  #value: T;
  /**
   * The equality function used to determine whether a new value is
   * meaningfully different from the current one.
   *
   * Called as `equals.call(signal, oldValue, newValue)`. If it returns
   * `true` the signal is considered unchanged and no propagation occurs.
   * Defaults to `Object.is` when not provided via options.
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.State internal slots'
   * @see Algorithm — 'Set Signal value'
   */
  #equals: SignalEqual<T>
  /**
   * Optional callback invoked (with `frozen = true`) the first time this
   * Signal gains a sink — i.e. when it transitions from un-observed to
   * observed by at least one `Watcher` (directly or transitively).
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.State internal slots'
   * @see Method — `Signal.subtle.Watcher.prototype.watch`
   */
  #watched?: NoArgsVoidFunction;
  /**
   * Optional callback invoked (with `frozen = true`) when this Signal loses
   * its last sink — i.e. when it transitions from observed back to
   * un-observed.
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.State internal slots'
   * @see Method — `Signal.subtle.Watcher.prototype.unwatch`
   */
  #unwatched?: NoArgsVoidFunction;
  /**
   * The set of watched signals that directly depend on this one.
   *
   * Populated only when this Signal is reachable from at least one active
   * `Watcher` — un-watched Signals have an empty sinks set, which allows
   * them to be garbage-collected independently from the rest of the graph.
   *
   * Should contain both `Computed` and `Watcher` instances, as both can be
   * direct dependents of a `State`.
   *
   * @internalSlot
   * @see Signal algorithms — 'Signal.State internal slots'
   * @see Method — `Signal.State.prototype.get` (NOTE on sinks)
   */
  #sinks: Set<Computed<unknown> | Watcher>;
  /**
   * Returns a snapshot of the current sinks set for introspection.
   *
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @returns An array of `Computed` and `Watcher` instances that depend on this Signal.
   * @internal
   */
  public getSinks(symbol: symbol): (Computed<unknown> | Watcher)[] {
    assertPrivateContext(symbol);
    return [...this.#sinks];
  }

  /**
   * Creates a new `State` signal.
   *
   * @param initialValue - The initial value of the signal.
   * @param options - Optional configuration:
   *   - `equals` — custom equality function; defaults to `Object.is`.
   *   - `watched` — called when the signal gains its first sink.
   *   - `unwatched` — called when the signal loses its last sink.
   *
   * @see Signal algorithms — 'Constructor: Signal.State(initialValue, options)'
   */
  constructor(initialValue: T, options?: SignalOptions<T>) {
    this.#value = initialValue;
    this.#equals = options?.equals ?? Object.is;
    this.#watched = options?.watched;
    this.#unwatched = options?.unwatched;
    this.#sinks = new Set;
  }

  /**
   * Returns the current value of the signal, registering this Signal as a
   * source of the innermost `Computed` currently being evaluated (if any).
   *
   * @throws If `frozen` is `true` — reads are forbidden while a protected
   * callback (`notify`, `watched`, `unwatched`) is executing.
   *
   * @see Signal algorithms — 'Method: Signal.State.prototype.get()'
   */
  public get(): T {
    if (GLOBAL_STATE.frozen) {
      throw new Error('Cannot get value while signals are frozen');
    }

    /*
      If there is a currently computing `Computed`, register this `State` as a
      source of that `Computed`. 
      This is how the dependency graph is built.

      THis is done every time a `State` is read to guarantee always up-to-date 
      tracking of dependencies, even if they change between computations
    */
    GLOBAL_STATE.computing?.addSource(this, PRIVATE)

    return this.#value;
  }

  /**
   * Updates the signal's value and propagates changes to all dependent
   * sinks.
   *
   * If `equals(currentValue, newValue)` returns `true` the call is a no-op
   * and no propagation occurs. Otherwise `#value` is updated, all direct
   * `Computed` sinks are marked `~dirty~`, indirect ones `~checked~`, and
   * each reachable `Watcher` has its `notify` callback invoked synchronously
   * (with `frozen = true`).
   *
   * @param newValue - The new value to set.
   * @throws If `frozen` is `true` — writes are forbidden while a protected
   * callback is executing.
   *
   * @see Signal algorithms — 'Method: Signal.State.prototype.set(newValue)'
   * @see Algorithm — 'Set Signal value'
   */
  public set(newValue: T): void {
    if (GLOBAL_STATE.frozen) {
      throw new Error('Cannot set value while signals are frozen');
    }

    if (!this.#equals.call(this, this.#value, newValue)) {
      this.#value = newValue;
      this.#sinks.forEach(sink => sink instanceof Computed ? sink.setState('dirty', PRIVATE) : sink.notify(PRIVATE));
    }
  }

  /**
   * Registers a new sink (a `Computed` or `Watcher` that depends on this
   * Signal) in the internal sinks set.
   *
   * Called by `Watcher.prototype.watch` when building the live dependency
   * chain, and by `Computed` when propagating sink registration up through
   * its sources.
   *
   * @param sink - The dependent node to register.
   * @param symbol - The private symbol for validation.
   * @internal
   */
  public addSink(sink: Computed | Watcher, symbol: symbol): void {
    assertPrivateContext(symbol);
    const empty = this.#sinks.size === 0;
    this.#sinks.add(sink);

    if (empty && this.#watched) {
      GLOBAL_STATE.frozen = true;
      try {
        this.#watched();
      } catch (error) {
        // This log is not present in the TC39 spec, could be removed in next versions
        if (isDevMode()) {
          console.error('Error thrown while running a State Signal watched callback:', error);
        }
        throw error;
      } finally {
        GLOBAL_STATE.frozen = false;
      }
    }
  }

  /**
   * Removes a sink from the internal sinks set.
   *
   * Called by `Watcher.prototype.unwatch` when tearing down the live
   * dependency chain. If the sinks set becomes empty after removal, the
   * caller is responsible for propagating the removal up through this
   * Signal's sources.
   *
   * @param sink - The dependent node to remove.
   * @param symbol - The private symbol for validation.
   * @internal
   */
  public removeSink(sink: Computed | Watcher, symbol: symbol): void {
    assertPrivateContext(symbol);
    this.#sinks.delete(sink);
    const empty = this.#sinks.size === 0;

    if (empty && this.#unwatched) {
      GLOBAL_STATE.frozen = true;
      try {
        this.#unwatched();
      } catch (error) {
        // This log is not present in the TC39 spec, could be removed in next versions
        if (isDevMode()) {
          console.error('Error thrown while running a State Signal unwatched callback:', error);
        }
        throw error;
      } finally {
        GLOBAL_STATE.frozen = false;
      }
    }
  }
}
