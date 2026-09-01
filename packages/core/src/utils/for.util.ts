import { Function, NoArgsFunction } from '@xaendar/types';
import { effect, signal, untracked } from '../signals';
import { IterationVariablesHandle } from '../types/iteration-variables.type';
import { Context, createAnchor } from './context.util';

type ForKey = string | number;

type ForEntry = {
  context: Context;
  update?: (newIndex: number, items: unknown[]) => void;
};

/**
 * Reactively iterates over a list of items. Items are matched across re-runs
 * by the key produced by `trackExpression`:
 * - key sopravvive → il Context e l'intero sottoalbero (stato, subscription,
 *   richieste pendenti) vengono riusati SEMPRE, indipendentemente da un
 *   eventuale cambio di indice: si spostano solo i nodi DOM, e se il body usa
 *   $index/$first/$last/$even/$odd questi vengono aggiornati in-place tramite
 *   `update`, senza ricreare nulla.
 * - key sparita → il Context viene distrutto.
 * - key nuova → il Context viene creato.
 *
 * @param forFn - Callback invocata per creare un nuovo item. Deve ritornare
 *   sia il Context che possiede i nodi, sia (opzionalmente) una funzione
 *   `update` per aggiornare le variabili implicite in-place quando l'item
 *   viene riusato a un indice diverso.
 */
export function _for(parentNode: HTMLElement, parentContext: Context, condition: NoArgsFunction<unknown[]>, trackExpression: Function<[unknown, number], ForKey>, forFn: Function<[HTMLElement, Context, unknown[], number, Node | null], { context: Context, update?: (newIndex: number, items: unknown[]) => void }>) {
  const anchor = createAnchor('for', parentNode, parentContext);
  let entries = new Map<ForKey, ForEntry>();

  const unlistener = effect(() => {
    const items = condition();
    const newKeys = items.map((item, i) => trackExpression(item, i));
    const newKeySet = new Set(newKeys);

    untracked(() => {
      const newEntries = new Map<ForKey, ForEntry>();

      for (const [key, entry] of entries) {
        if (!newKeySet.has(key)) {
          entry.context.unlisten();
          parentContext.removeChild(entry.context);
        }
      }

      let nextReference: Node = anchor;

      for (let i = items.length - 1; i >= 0; i--) {
        const key = newKeys[i];
        const existing = entries.get(key);

        let entry: ForEntry;

        if (existing) {
          const nodes = existing.context.getNodes();
          const lastNode = nodes[nodes.length - 1];
          if (lastNode?.nextSibling !== nextReference) {
            for (let i = 0; i < nodes.length; i++) {
              parentNode.insertBefore(nodes[i], nextReference);
            }
          }
          existing.update?.(i, items);
          entry = existing;
        } else {
          const created = forFn(parentNode, parentContext, items, i, nextReference);
          parentContext.addChild(created.context);
          entry = created;
        }

        newEntries.set(key, entry);
        const ownNodes = entry.context.getNodes();
        nextReference = ownNodes[0] ?? nextReference;
      }

      entries = newEntries;
    });
  });

  parentContext.listen(unlistener);
}

/**
 * Builds a record of iteration context variables for a given index in the loop.
 * `item` is a plain value (identity-stable across moves thanks to the key),
 * while `$index`/`$first`/`$last`/`$even`/`$odd` are signals: when an item is
 * moved to a different position in the array, `update()` writes the new
 * values into these signals in place, instead of recreating the item's
 * template output. Anything bound to these variables re-runs reactively;
 * everything else in the item's subtree (state, subscriptions, pending
 * requests) is left completely untouched.
 *
 * @param items - The full array being iterated.
 * @param index - The current iteration index.
 * @param itemName - The identifier to reference the i-th item during iteration.
 * @param aliases - Aliases for implicit variables defined in the `@for` loop.
 * @returns A handle exposing the resolved variables and an `update` function.
 */
export function _iterationVariables(context: Context, items: unknown[], index: number, itemName: string, aliases: { $index: string, $first: string, $last: string, $even: string, $odd: string }): IterationVariablesHandle {
  const $index = signal(index);
  const $first = signal(index === 0);
  const $last = signal(index === items.length - 1);
  const $even = signal(index % 2 === 0);
  const $odd = signal(index % 2 !== 0);

  const retVal = {
    vars: {
      [itemName]: items[index],
      [aliases.$index]: $index,
      [aliases.$first]: $first,
      [aliases.$last]: $last,
      [aliases.$even]: $even,
      [aliases.$odd]: $odd,
    },
    update(newIndex: number, newItems: unknown[]) {
      $index.set(newIndex);
      $first.set(newIndex === 0);
      $last.set(newIndex === newItems.length - 1);
      $even.set(newIndex % 2 === 0);
      $odd.set(newIndex % 2 !== 0);
    }
  };

  const entries = Object.entries(retVal.vars);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    context.addIdentifier(key, value)
  }

  return retVal
}