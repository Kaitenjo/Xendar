import { Computed } from './models/computed/computed';
import { State } from './models/state/state';
import { Watcher } from './models/watcher/watcher';
import { currentComputed, hasSinks, hasSources, introspectSinks, introspectSources, untrack } from './subtle';
import { setDevMode } from './utils/dev-mode/dev-mode';

/**
 * Loads the Signals library by defining the `Signal` global object with the following properties:
 * - `State`: The `State` class for creating reactive state variables.
 * - `Computed`: The `Computed` class for creating derived reactive values.
 * - `Watcher`: The `Watcher` class for observing changes in signals.
 * - `subtle`: An object containing internal utility functions for working with signals, including:
 *  - `untrack`: Executes a function without tracking dependencies.
 *  - `currentComputed`: Returns the currently active `Computed` instance being evaluated, or `null` if none.
 *  - `introspectSources`: Returns the list of sources for a given `Computed` or `Watcher`.
 *  - `introspectSinks`: Returns the list of sinks for a given `State` or `Computed`.
 *  - `hasSinks`: Returns `true` if a given `State` or `Computed` has at least one sink.
 *  - `hasSources`: Returns `true` if a given `Computed` or `Watcher` has at least one source.
 *  - `Watcher`: The `Watcher` class for observing changes in signals.
 * 
 * This function should be called once to initialize the Signals library and make its API available globally.
 *
 * @param options - Optional configuration object.
 * @param options.devMode - When `true`, enables development mode with extra runtime checks and logging.
 */
export function loadSignals(options?: { devMode?: boolean }): void {
  setDevMode(options?.devMode ?? false)

  globalThis.Signal ??= {
    State,
    Computed,
    subtle: {
      untrack,
      currentComputed,
      introspectSources: introspectSources as unknown as typeof Signal.subtle.introspectSources,
      introspectSinks: introspectSinks as unknown as typeof Signal.subtle.introspectSinks,
      hasSinks: hasSinks as unknown as typeof Signal.subtle.hasSinks,
      hasSources: hasSources as unknown as typeof Signal.subtle.hasSources,
      Watcher
    }
  }
}