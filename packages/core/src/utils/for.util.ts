import { Function, NoArgsVoidFunction } from '@xaendar/types';
import { effect } from '../signals';
import { Context } from './context.util';

/**
 * Reactively iterates over a list of items, re-running the loop whenever the tracked condition changes.
 * Previous iteration side-effects are cleaned up before each re-evaluation.
 *
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param condition - A reactive function that returns the array of items to iterate over.
 * @param forFn - A callback invoked for each item, receiving the parent node, the item, and its index. Must return an array of cleanup functions.
 */
export function _for(parentNode: HTMLElement, parentContext: Context, condition: () => unknown[], forFn: Function<[parentNode: HTMLElement, context: Context, items: unknown[], index: number], Context>) {
  let contexts = new Array<Context>;
  const unlistener = effect(() => {
    contexts.forEach(context => {
      context.unlisten();
      parentContext.removeChild(context);
    });
    contexts = [];
    const items = condition();
    Signal.subtle.untrack(() => {
      for (let i = 0; i < items.length; i++) {
        const context = forFn(parentNode, parentContext, items, i);
        contexts.push(context);
        parentContext.addChild(context);
      }
    });
  });

  parentContext.listen(unlistener);
}

/**
 * Builds a record of iteration context variables for a given index in the loop.
 * Provides the current item, index, and convenience flags (`$first`, `$last`, `$even`, `$odd`).
 *
 * @param items - The full array being iterated.
 * @param index - The current iteration index.
 * @param itemName - The identifier to reference the i-th item during iteration
 * @param aliases - Aliases for implicit variables defined in the `{@for} loop`
 * @returns A record mapping alias names and built-in variables to their values.
 */
export function _iterationVariables(items: unknown[], index: number, itemName: string, aliases: { $index: string, $first: string, $last: string, $even: string, $odd: string }): Record<string, unknown> {
  const even = index % 2 === 0;

  return {
    [itemName]: items[index],
    [aliases.$index]: index,
    [aliases.$first]: index === 0,
    [aliases.$last]: index === items.length - 1,
    [aliases.$even]: even,
    [aliases.$odd]: !even
  };
}