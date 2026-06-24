/**
 * Executes a function without tracking any dependencies.
 * @param fn - The function to execute without tracking.
 * @returns The result of the function execution.
 */
export const untracked = Signal.subtle.untrack;