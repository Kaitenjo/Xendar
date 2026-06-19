import { Function, NoArgsVoidFunction } from '@xaendar/types';
import { unwatch } from './if.utils';
import { effect } from '../signals';
import { Context } from './context.utils';

/**
 * Reactively iterates over a list of items, re-running the loop whenever the tracked condition changes.
 * Previous iteration side-effects are cleaned up before each re-evaluation.
 *
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param unwatchFns - Array collecting cleanup functions for the parent scope.
 * @param condition - A reactive function that returns the array of items to iterate over.
 * @param forFn - A callback invoked for each item, receiving the parent node, the item, and its index. Must return an array of cleanup functions.
 */
export function _for(parentNode: HTMLElement, parentContext: Context, unwatchFns: NoArgsVoidFunction[], condition: () => unknown[], forFn: Function<[parentNode: HTMLElement, context: Context, item: unknown, index: number], NoArgsVoidFunction[]>) {
  const localUnwatchFns = new Array<NoArgsVoidFunction>;
  const unlistener = effect(() => {
    unwatch(unwatchFns, localUnwatchFns);
    const items = condition();
    Signal.subtle.untrack(() => {
      for (let i = 0; i < items.length; i++) {
        localUnwatchFns.push(...forFn(parentNode, parentContext, items[i], i));
        unwatchFns.push(...localUnwatchFns);
      }
    });
  });

  unwatchFns.push(unlistener);
}

/**
 * Builds a record of iteration context variables for a given index in the loop.
 * Provides the current item, index, and convenience flags (`$first`, `$last`, `$even`, `$odd`).
 *
 * @param items - The full array being iterated.
 * @param index - The current iteration index.
 * @param itemAlias - The template alias name for the current item.
 * @param indexAlias - The template alias name for the current index.
 * @returns A record mapping alias names and built-in variables to their values.
 */
export function _iterationVariables(items: unknown[], index: number, itemAlias: string, indexAlias: string): Record<string, unknown> {
  const even = index % 2 === 0;

  return {
    [itemAlias]: items[index],
    [indexAlias]: index,
    $first: index === 0,
    $last: index === items.length - 1,
    $even: even,
    $odd: !even
  };
}