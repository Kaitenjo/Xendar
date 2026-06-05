import { Computed } from './models/computed/computed';
import { State } from './models/state/state';
import { Watcher } from './models/watcher/watcher';
import { isDevMode } from './utils/dev-mode/dev-mode';
import { GLOBAL_STATE } from './utils/globals/globals';
import { PRIVATE } from './utils/private-symbol/private-symbol';

/**
 * Executes a function without tracking any dependencies.
 * @param fn - The function to execute without tracking.
 * @returns The result of the function execution.
 */
export function untrack<T>(fn: () => T): T {
  const prevComputing = GLOBAL_STATE.computing;
  GLOBAL_STATE.computing = null;

  try {
    return fn();
  } catch (error) {
    // This log is not present in the TC39 spec, could be removed in next versions
    if (isDevMode()) {
      console.error('Error thrown while running an Untracked signal:', error);
    }
    throw error;
  } finally {
    GLOBAL_STATE.computing = prevComputing;
  }
}

/**
 * Returns the currently active `Computed` instance being evaluated, or `null`
 * @returns The currently active `Computed` instance, or `null` if none is being evaluated.
 */
export function currentComputed(): Computed | null {
  return GLOBAL_STATE.computing;
}

/**
 * Returns the ordered list of all Signals which the given `Computed` or
 * `Watcher` referenced during its last evaluation.
 *
 * - For a `Computed`, these are the Signals read inside its callback.
 * - For a `Watcher`, these are the Signals it is currently watching.
 *
 * @param signal - The `Computed` or `Watcher` to introspect.
 * @returns An array of `State` and `Computed` instances.
 */
export function introspectSources(signal: Computed | Watcher): (State | Computed)[] {
  return signal.getSources(PRIVATE);
}

/**
 * Returns the direct dependents of the given Signal — Watchers that contain
 * it, plus any `Computed` Signals which read it during their last evaluation
 * (if that `Computed` is recursively watched).
 *
 * @param signal - The `State` or `Computed` Signal to introspect.
 * @returns An array of `Computed` and `Watcher` instances.
 */
export function introspectSinks(signal: State | Computed): (Computed | Watcher)[] {
  return signal.getSinks(PRIVATE);
}

/**
 * Returns `true` if the given Signal is 'live' — i.e. it is watched by a
 * `Watcher`, or it is read by a `Computed` Signal which is (recursively)
 * live.
 *
 * @param signal - The `State` or `Computed` Signal to check.
 * @returns `true` if the Signal has at least one sink.
 */
export function hasSinks(signal: State | Computed): boolean {
  return signal.getSinks(PRIVATE).length > 0;
}

/**
 * Returns `true` if the given node is 'reactive' — i.e. it depends on some
 * other Signal. A `Computed` where `hasSources` is `false` will always
 * return the same constant.
 *
 * @param signal - The `Computed` or `Watcher` to check.
 * @returns `true` if the node has at least one source.
 */
export function hasSources(signal: Computed | Watcher): boolean {
  return signal.getSources(PRIVATE).length > 0;
}