import { NoArgsVoidFunction } from "@xaendar/types";
import { EffectOptions } from "../../types/effect-options.type";

/**
 * Runs a side-effectful function and automatically re-runs it whenever any
 * Signal read during its execution changes.
 *
 * Internally, `effect` wraps the user callback inside a `Computed` node
 * (for dependency tracking) and observes it with a `Watcher` (for push
 * notifications). When any tracked dependency changes, the `Watcher`
 * schedules a microtask that re-evaluates the `Computed`, which in turn
 * re-runs the user callback and re-registers the new set of dependencies.
 *
 * The returned disposer function stops the effect: it unwatches the internal
 * `Computed` from the `Watcher`, severing all dependency subscriptions so
 * the callback is never called again and the graph nodes can be
 * garbage-collected.
 *
 * @example
 * ```ts
 * const count = new State(0);
 *
 * const stop = effect(() => {
 *   console.log('count is', count.get());
 * });
 * // logs: "count is 0"
 *
 * count.set(1); // logs: "count is 1"
 * count.set(2); // logs: "count is 2"
 *
 * stop();       // no more logs
 * count.set(3); // silent
 * ```
 *
 * @param fn - The side-effectful function to run. Any Signal read inside it
 *   is tracked as a dependency.
 * @returns A disposer function that, when called, permanently stops the effect.
 */
export function effect(fn: NoArgsVoidFunction, options?: EffectOptions): NoArgsVoidFunction {
  /**
   * Wrap the user callback in a Computed so that automatic dependency
   * tracking (via pushComputed / popComputed) works for free.
   * The Computed always returns `undefined` — we only care about the
   * side-effects and the tracked sources, not the value.
   */
  const computed = new Signal.Computed<void>(() => fn());

  let needsEnqueue = true;

  /**
   * The Watcher is notified synchronously as soon as any tracked dependency
   * changes. Its job is purely to schedule the re-execution; the actual
   * re-evaluation happens asynchronously in a microtask so that multiple
   * synchronous signal updates are batched into a single re-run.
   */
  const watcher = new Signal.subtle.Watcher(() => {
    if (needsEnqueue) {
      needsEnqueue = false;
      queueMicrotask(() => {
        needsEnqueue = true;
        options?.onBeforeRun?.();
        watcher.getPending().forEach(computed => computed.get());
        options?.onAfterRun?.();
        watcher.watch();
      });
    }
  });

  // Initial synchronous execution + first subscription.
  options?.onBeforeRun?.();
  watcher.watch(computed);
  computed.get();
  options?.onAfterRun?.();

  /**
   * Disposer — call this to permanently stop the effect.
   *
   * Unwatching the Computed tears down the entire live dependency chain
   * (Watcher → Computed → all sources), preventing any further
   * notifications and allowing GC.
   */
  return () => {
    options?.onCleanup?.();
    watcher.unwatch(computed)
  };
}