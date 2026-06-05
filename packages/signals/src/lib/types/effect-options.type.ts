import { NoArgsVoidFunction } from "@xaendar/types";

/**
 * Options for configuring an effect.
 */
export type EffectOptions = {
  /**
   * Registers a cleanup function that is called before the effect re-runs or when it is disposed.
   * @param cleanupFn - The function to invoke during cleanup.
   */
  onCleanup?: NoArgsVoidFunction;
  /**
   * Called before the effect re-runs.
   */
  onBeforeRun?: () => void;
  /**
   * Called after the effect re-runs.
   */
  onAfterRun?: () => void;
}