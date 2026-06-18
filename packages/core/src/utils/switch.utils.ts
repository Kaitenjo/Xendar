import { NoArgsFunction, NoArgsVoidFunction } from '@xaendar/types';
import { _if } from './if.utils';

/**
 * Creates a reactive switch/case structure by converting it into an if/else-if chain
 * and delegating to {@link _if}.
 *
 * Each case block's condition values are compared against the result of the
 * `expression` function using strict equality (`===`). A block with
 * `condition: null` acts as the `default` branch (mapped to the `else` branch
 * in the underlying if/else-if chain). Multiple values per case are supported
 * (e.g. fall-through cases) and matched with `Array.some`.
 *
 * Because it delegates to `_if`, the switch benefits from the same optimisation:
 * the active branch is only re-rendered when it actually changes.
 *
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param unwatchFns - Shared array that collects all active cleanup functions.
 *   Mutated in place by the underlying {@link _if} call.
 * @param expression - Function that evaluates the switch expression. Called
 *   reactively inside an effect so that signal reads are tracked.
 * @param blocks - Ordered list of case branches. Each entry contains:
 *   - `condition`: array of values to match against the expression result,
 *     or `null` for the default branch.
 *   - `block`: function that applies the branch's side effects and returns
 *     its cleanup functions.
 */
export function _switch(
  parentNode: HTMLElement,
  unwatchFns: NoArgsVoidFunction[],
  expression: NoArgsFunction<unknown>,
  blocks: Array<{ 
    condition: unknown[] | null, 
    block: NoArgsFunction<NoArgsVoidFunction[]> 
  }>
): void {
  _if(parentNode, unwatchFns, blocks.map(({ condition, block }) => ({
    condition: condition 
      ? () => condition.some(condition => condition === expression())
      : undefined,
    block
  })));
}
  