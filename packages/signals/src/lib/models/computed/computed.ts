
import { GLOBAL_STATE, popComputed, pushComputed } from '../../utils/globals/globals';
import { PRIVATE, assertPrivateContext } from '../../utils/private-symbol/private-symbol';
import { ComputedState } from '../../types/computed-state.type';
import { SignalEqual } from '../../types/signal-equal.type';
import { SignalOptions } from '../../types/signal-options.type';
import { State } from '../state/state';
import { Watcher } from '../watcher/watcher';
import { isDevMode } from '../../utils/dev-mode/dev-mode';

/**
 * A read-only Signal whose value is derived lazily from other Signals.
 *
 * The value is recomputed only when explicitly read and only if one or more
 * of its (recursive) dependencies have changed since the last evaluation.
 * The result is cached and reused until the Signal becomes stale again.
 *
 * @template T The type of the computed value.
 *
 * @see Signal algorithms — "The Signal.Computed class"
 */
export class Computed<T = any> {
  /**
   * The current value of the signal.
   *
   * Uninitialised (`!`) until the first evaluation. After that, holds either
   * the return value of `#callback` or a boxed error
   * `{ isError: true; value: Error }` if the last evaluation threw.
   *
   * @internalSlot
   * @see Signal algorithms — "Signal.Computed internal slots"
   */
  #value!: T | { isError: true; value: Error };
  /**
   * The current evaluation state of this Signal.
   *
   * - `~dirty~`     — value is known to be stale or has never been evaluated.
   * - `~checked~`   — an indirect source changed; may or may not be stale.
   * - `~computing~` — `#callback` is currently executing; guards against cycles.
   * - `~clean~`     — cached value is up-to-date.
   *
   * @internalSlot
   * @see Signal algorithms — "Signal.Computed State machine"
   */
  #state: ComputedState;
  /**
   * The ordered set of Signals read during the last evaluation of
   * `#callback`. Cleared and rebuilt on every re-evaluation so that
   * conditional branches that are no longer taken stop being tracked.
   *
   * May contain both `State` and `Computed` instances.
   *
   * @internalSlot
   * @see Signal algorithms — "Signal.Computed internal slots"
   */
  #sources: Set<State<unknown> | Computed<unknown>>;
  /**
 * Returns a snapshot of the current sources set for introspection.
 *
 * @param symbol - Private access symbol; rejects calls from outside the library.
 * @returns An array of `State` and `Computed` instances that this Signal depends on.
 * @internal
 */
  public getSources(symbol: symbol): (State<unknown> | Computed<unknown>)[] {
    assertPrivateContext(symbol);
    return [...this.#sources];
  }
  /**
   * The set of Signals and Watchers that directly depend on this Signal.
   *
   * Populated only when this Signal is reachable from at least one active
   * `Watcher`. An un-watched `Computed` has an empty sinks set, which allows
   * it to be garbage-collected independently from the rest of the graph.
   *
   * @internalSlot
   * @see Signal algorithms — "Signal.Computed internal slots"
   * @see Method — `Signal.Computed.prototype.get` (NOTE on sinks)
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
   * The equality function used to determine whether a newly computed value
   * is meaningfully different from the previously cached one.
   *
   * Called as `equals.call(computed, oldValue, newValue)`. Returns `true` if
   * the values are considered equal, in which case no downstream propagation
   * occurs. Defaults to `Object.is` when not provided via options.
   *
   * If this function throws, the exception is cached as the Signal's value
   * and the outcome is treated as `~dirty~`.
   *
   * @internalSlot
   * @see Signal algorithms — "Signal.Computed internal slots"
   * @see Algorithm — "Set Signal value"
   */
  #equals: SignalEqual<T>;
  /**
   * The pure function that produces this Signal's value. Evaluated lazily
   * whenever the Signal is read while in a `~dirty~` or `~checked~` state.
   *
   * Called with `this` bound to the `Computed` instance itself so that
   * internal methods (e.g. `addSource`) are accessible if needed.
   * Any exception thrown by this function is caught and cached.
   *
   * @internalSlot
   * @see Signal algorithms — "Signal.Computed internal slots"
   */
  #callback: (this: Computed<T>) => T;

  /**
   * Creates a new `Computed` signal.
   *
   * The Signal starts in the `~dirty~` state with an uninitialised value, so
   * `#callback` will be invoked on the first `get()`.
   *
   * @param cb - Pure function evaluated lazily to produce the value.
   *   Receives the `Computed` instance as `this`.
   * @param options - Optional configuration:
   *   - `equals` — custom equality function; defaults to `Object.is`.
   *
   * @see Signal algorithms — "Signal.Computed Constructor"
   */
  constructor(cb: (this: Computed<T>) => T, options?: SignalOptions<T>) {
    this.#callback = cb;
    this.#equals = options?.equals ?? Object.is;
    this.#sources = new Set;
    this.#sinks = new Set;
    this.#state = 'dirty';
  }

  /**
   * Returns the current value of this Signal, re-evaluating `#callback` if
   * the cached value may be stale.
   *
   * Registers this Signal as a source of any outer `Computed` currently
   * being evaluated (automatic dependency tracking).
   *
   * If the state is `~dirty~` or `~checked~`, walks the source graph
   * depth-first to find and recalculate the deepest stale `Computed` first,
   * then re-checks upward until this Signal is `~clean~`.
   *
   * @returns The current computed value, or a boxed error object if the last
   *   evaluation threw.
   * @throws If `frozen` is `true`.
   * @throws If the Signal is in the `~computing~` state (cyclic dependency).
   *
   * @see Signal algorithms — "Method: Signal.Computed.prototype.get"
   */
  public get(): T | { isError: true; value: Error } {
    if (GLOBAL_STATE.frozen) {
      throw new Error('Cannot get value of a Computed signal while the global state is frozen');
    }

    if (this.#state === 'computing') {
      throw new Error('Circular dependency detected while computing a Computed signal');
    }

    GLOBAL_STATE.computing?.addSource(this, PRIVATE);

    if (this.#sinks.size === 0) {
      this.#computeValue();
    } else if (this.#state === 'dirty' || this.#state === 'checked') {
      while (this.#state === 'dirty' || this.#state === 'checked') {
        const deepest = this.#findDeepestStale();
        deepest.#computeValue();
      }
    }

    return this.#value;
  }

  /**
   * Registers a Signal as a source of this `Computed`, discovered during the
   * execution of `#callback`.
   *
   * If this `Computed` is currently being watched (has at least one sink),
   * the source is also informed of this Signal as a new sink, building the
   * live push-notification chain upward.
   *
   * @param source - The Signal read during evaluation.
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @internal
   */
  public addSource(source: State | Computed, symbol: symbol) {
    assertPrivateContext(symbol);
    this.#sources.add(source);
    source.addSink(this, PRIVATE)
  }

  /**
   * Returns the current evaluation state of this Signal.
   *
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @internal
   * @see Signal algorithms — "Signal.Computed State machine"
   */
  public getState(symbol: symbol): ComputedState {
    assertPrivateContext(symbol);
    return this.#state;
  }

  /**
   * Transitions this Signal to a new evaluation state.
   *
   * Only valid transitions (as defined by the state machine) are allowed.
   * Invalid transitions throw an error.
   *
   * @param newState - The target state.
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @throws If the transition from the current state to `newState` is not allowed.
   * @internal
   * @see Signal algorithms — "Signal.Computed State machine"
   */
  public setState(newState: ComputedState, symbol: symbol): void {
    assertPrivateContext(symbol);

    if (this.#state === newState) {
      return;
    }

    if (!this.#isValidTransition(this.#state, newState)) {
      if (isDevMode()) {
        console.warn(`Invalid state transition from ${this.#state} to ${newState} in Computed Signal`);
        console.warn(new Error().stack)
      }
      return;
    }

    this.#state = newState;

    if (this.#state === 'dirty' || this.#state === 'checked') {
      this.#sinks.forEach(sink => sink instanceof Computed ? sink.setState('checked', PRIVATE) : sink.notify(PRIVATE))
    }
  }

  /**
   * Registers a new sink (a `Computed` or `Watcher` that directly depends on
   * this Signal) in the internal sinks set.
   *
   * If this is the first sink, propagates the sink registration recursively
   * up through `#sources`, building the live dependency chain that enables
   * push-based invalidation.
   *
   * @param sink - The dependent node to register.
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @internal
   */
  public addSink(sink: Computed<unknown> | Watcher, symbol: symbol) {
    assertPrivateContext(symbol);
    if (this.#sinks.size === 0) {
      this.#sources.forEach(source => source.addSink(this, PRIVATE));
    }
    this.#sinks.add(sink);
  }

  /**
   * Removes a sink from the internal sinks set.
   *
   * If the sinks set becomes empty after removal, propagates the removal
   * recursively up through `#sources`, tearing down the live dependency
   * chain and allowing garbage collection of un-watched nodes.
   *
   * @param sink - The dependent node to remove.
   * @param symbol - Private access symbol; rejects calls from outside the library.
   * @internal
   */
  public removeSink(sink: Computed | Watcher, symbol: symbol) {
    assertPrivateContext(symbol);
    this.#sinks.delete(sink);

    if (this.#sinks.size === 0) {
      this.#sources.forEach(source => source.removeSink(this, PRIVATE));
    }
  }

  /**
   * Recursively walks the source graph depth-first to find the deepest,
   * left-most `Computed` node that is in a `~dirty~` or `~checked~` state.
   *
   * This ensures that recalculation always starts from the bottom of the
   * dependency graph, so every node sees already-updated dependencies —
   * the core of glitch-free evaluation.
   *
   * Cuts off the search when hitting a `~clean~` `Computed` source, since
   * its subtree is guaranteed to be up-to-date.
   *
   * @returns The deepest stale `Computed` found, or `node` itself if none of
   *   its sources are stale.
   */
  #findDeepestStale(): Computed {
    const unclearNode = [...this.#sources].find((source): source is Computed => source instanceof Computed && (source.#state === 'dirty' || source.#state === 'checked'));
    return unclearNode ? unclearNode.#findDeepestStale() : this;
  }

  /**
   * Executes `#callback` to recompute this Signal's value.
   *
   * Implements the "recalculate dirty computed Signal" algorithm:
   * 1. Clears stale sources and removes this Signal from their sinks.
   * 2. Sets `computing` to this Signal for automatic dependency tracking.
   * 3. Runs the callback, caching the return value or any thrown exception.
   * 4. Restores the previous `computing` value.
   * 5. Runs the "set Signal value" algorithm to detect value changes.
   * 6. Transitions state to `~clean~`.
   * 7. Propagates `~dirty~` to sinks (or attempts `~clean~` if value unchanged).
   *
   * @see Signal algorithms — "Algorithm: recalculate dirty computed Signal"
   */
  #computeValue(): void {
    this.#sources.forEach(source => source.removeSink(this, PRIVATE));
    this.#sources.clear();

    pushComputed(this);
    this.setState('computing', PRIVATE);

    let newValue: T | { isError: true; value: Error };

    try {
      newValue = this.#callback.call(this);
    } catch (error) {
      // This log is not present in the TC39 spec, could be removed in next versions
      if (isDevMode()) {
        console.error('Error thrown while computing a Computed signal:', error);
      }
      newValue = { isError: true, value: error as Error };
    } finally {
      popComputed();
    }

    const outcome = this.#setValue(newValue);

    this.setState('clean', PRIVATE);

    outcome === 'dirty'
      ? this.#sinks.forEach(sink => sink instanceof Computed ? sink.setState('dirty', PRIVATE) : sink.notify(PRIVATE))
      : this.#propagateClean();
  }

  /**
   * Implements the "set Signal value" algorithm.
   *
   * Compares the new value against the cached one using `#equals`. If equal,
   * returns `~clean~` and leaves `#value` untouched. Otherwise updates
   * `#value` and returns `~dirty~`.
   *
   * Special cases:
   * - If `newValue` is a boxed error, `#equals` is skipped and the error is
   *   cached directly.
   * - If `#equals` itself throws, the exception is cached as a boxed error
   *   and the outcome is `~dirty~`.
   *
   * @param newValue - The value (or boxed error) produced by `#callback`.
   * @returns `~clean~` if the value is unchanged, `~dirty~` otherwise.
   *
   * @see Signal algorithms — "Set Signal value algorithm"
   */
  #setValue(newValue: T | { isError: true; value: Error }): 'clean' | 'dirty' {
    const oldValue = this.#value;

    /*
      If new value is an error we always update without calling equals
    */
    if (this.#isErrorValue(newValue)) {
      this.#value = newValue;
      return 'dirty';
    }

    try {
      if (!this.#isErrorValue(oldValue) && this.#equals.call(this, oldValue, newValue)) {
        return 'clean';
      }
    } catch (equalsError) {
      this.#value = { isError: true, value: equalsError as Error };
      return 'dirty';
    }

    this.#value = newValue;
    return 'dirty';
  }

  /**
   * Recursively marks `~checked~` sinks as `~clean~` when all of their
   * immediate sources are already `~clean~`.
   *
   * Called after a recalculation that produced an unchanged value (`~clean~`
   * outcome from `#setValue`). Propagates the clean signal upward through
   * the graph so that Computed nodes that were only transitively dirty — and
   * whose dependencies have not actually changed — are not needlessly
   * re-evaluated on the next read.
   *
   * @see Signal algorithms — "Algorithm: recalculate dirty computed Signal"
   */
  #propagateClean(): void {
    [...this.#sinks]
      .filter((sink): sink is Computed<unknown> => sink instanceof Computed && sink.#state === 'checked')
      .forEach(sink => {
        const allSourcesClean = [...sink.#sources].every(source => !(source instanceof Computed) || source.#state === 'clean');
        if (allSourcesClean) {
          sink.#state = 'clean';
          sink.#propagateClean();
        }
      });
  }

  /**
   * Type guard that checks whether a value is a boxed error object.
   *
   * Used to distinguish a legitimately computed value from a cached
   * exception produced by `#callback` or `#equals`.
   *
   * @param value - The value to inspect.
   * @returns `true` if `value` is `{ isError: true; value: Error }`.
   */
  #isErrorValue(value: unknown): value is { isError: true; value: Error } {
    return typeof value === 'object' && !!value && 'isError' in value;
  }

  #isValidTransition(from: ComputedState, to: ComputedState): boolean {
    switch (from) {
      case 'checked':
        return to === 'clean' || to === 'dirty';
      case 'clean':
        return to === 'checked' || to === 'dirty';
      case 'dirty':
        return to === 'computing';
      case 'computing':
        return to === 'clean';
    }
  }
}