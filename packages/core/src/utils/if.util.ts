import { Function, NoArgsFunction } from '@xaendar/types';
import { effect, untracked } from '../signals';
import { Context, createAnchor } from './context.util';

/**
 * Represents a single branch of a conditional structure (`if` / `else if` / `else`).
 *
 * @property condition - Function that evaluates the branch condition and returns a boolean.
 *   If absent, the branch is always considered valid (represents the `else` branch).
 * @property block - Function that, when executed, applies the branch's side effects and
 *   returns the list of cleanup (unwatch) functions generated within it.
 */
type Block = {
  condition?: NoArgsFunction<boolean>,
  block: Function<[HTMLElement, Context, Node | null], Context>
};

type State = {
  activeBranch: number | null;
  context: Context
}

/**
 * Creates a reactive conditional structure from a list of branches.
 *
 * Depending on the number of branches provided, the appropriate evaluation strategy
 * is selected:
 * - 1 branch  → simple `if` (see {@link handleIf});
 * - 2 branches → `if` / `else` (see {@link handleIfElse});
 * - 3+ branches → `if` / `else if` / ... / `else` (see {@link handleIfElseIf}).
 *
 * The evaluation is wrapped in an {@link effect}, so it is automatically re-executed
 * whenever any signal read by the conditions changes. On each re-execution, the current
 * state (which branch is active) and the related cleanup functions are only updated if
 * the active branch has actually changed.
 *
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param blocks - Ordered list of conditional branches to evaluate.
 */
export function _if(parentNode: HTMLElement, parentContext: Context, blocks: Block[]): void {
  const anchor = createAnchor('if', parentNode, parentContext);
  
  let state: State | undefined;
  let fn: (state: State | undefined) => State | undefined;

  switch (blocks.length) {
    case 1:
      fn = (state: State | undefined) => handleIf(parentNode, parentContext, blocks[0], state, anchor);
      break;

    case 2:
      fn = (state: State | undefined) => handleIfElse(parentNode, parentContext, blocks[0], blocks[1], state, anchor);
      break;

    default:
      fn = (state: State | undefined) => handleIfElseIf(parentNode, parentContext, blocks, state, anchor);
  }

  const unlistener = effect(() => state = fn(state));
  parentContext.listen(unlistener);
}

/**
 * Handles the simple `if` case (a single branch, no `else`).
 *
 * If the condition is true, the branch is activated (state `0`); otherwise, any
 * previously active branch is deactivated by resetting the state to `null` and
 * executing an empty block.
 *
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param ifBlock - The `if` branch to evaluate.
 * @param state - The current state (index of the active branch, or `null` if none).
 * @returns The new state and new cleanup functions if the active branch changed,
 *   otherwise `undefined`.
 */
function handleIf(
  parentNode: HTMLElement,
  parentContext: Context,
  ifBlock: Block,
  state: State | undefined,
  anchor: Comment
): State | undefined {
  if (ifBlock.condition!()) {
    return checkAndUpdateState(parentNode, parentContext, state, 0, ifBlock.block, anchor);
  }

  teardown(parentContext, state);
}

/**
 * Handles the `if` / `else` case (exactly two branches).
 *
 * If the `if` condition is true, the first branch is activated (state `0`); otherwise,
 * the `else` branch is activated (state `1`).
 * 
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param ifBlock - The `if` branch to evaluate.
 * @param elseBlock - The `else` branch used when the `if` condition is false.
 * @param state - The current state (index of the active branch, or `null` if none).
 * @returns The new state and new cleanup functions if the active branch changed,
 *   otherwise `undefined`.
 */
function handleIfElse(
  parentNode: HTMLElement,
  parentContext: Context,
  ifBlock: Block,
  elseBlock: Block,
  state: State | undefined,
  anchor: Comment
): State | undefined {
  return ifBlock.condition!()
    ? checkAndUpdateState(parentNode, parentContext, state, 0, ifBlock.block, anchor)
    : checkAndUpdateState(parentNode, parentContext, state, 1, elseBlock.block, anchor);
}

/**
 * Handles the general case of an `if` / `else if` / ... / `else` chain (three or more branches).
 *
 * Iterates through the branches in order and activates the first one whose condition is
 * true; a branch without a condition is always considered valid and acts as the final
 * `else`. The state is set to the index of the activated branch.
 * 
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param blocks - Ordered list of conditional branches to evaluate.
 * @param state - The current state (index of the active branch, or `null` if none).
 * @returns The new state and new cleanup functions if the active branch changed,
 *   otherwise `undefined`. Also returns `undefined` if no branch matches.
 */
function handleIfElseIf(
  parentNode: HTMLElement,
  parentContext: Context,
  blocks: Block[],
  state: State | undefined,
  anchor: Comment
): State | undefined {
  for (let i = 0; i < blocks.length; i++) {
    const { condition, block } = blocks[i];
    if (!condition || condition()) {
      return checkAndUpdateState(parentNode, parentContext, state, i, block, anchor);
    }
  }
}

/**
 * Updates the conditional structure state only when the active branch changes.
 *
 * If `newState` differs from `state`:
 * 1. runs cleanup of the previous branch's functions (see {@link unwatch});
 * 2. executes the new branch's block via {@link Signal.subtle.untrack} to avoid
 *    creating unwanted reactive dependencies during block execution;
 * 3. registers the new cleanup functions in the shared `unwatchFns` array.
 *
 * If the branch has not changed, no operation is performed.
 *
 * @param parentNode - The parent HTML element where the conditional structure is applied.
 * @param parentContext - The parent Context object containing all the variables definition from the Parent Closure
 * @param state - The current state (index of the active branch, or `null` if none).
 * @param newState - The new state to set (index of the branch to activate, or `null`).
 * @param conditionalBlockFn - Branch function to execute, which returns its own
 *   cleanup functions.
 * @returns The updated state if the active branch changed, or `undefined` if the branch
 *   is unchanged.
 */
function checkAndUpdateState(
  parentNode: HTMLElement,
  parentContext: Context,
  state: State | undefined,
  newState: number | null,
  conditionalBlockFn: Function<[HTMLElement, Context, Node | null], Context>,
  anchor: Comment
): State | undefined {
 if (state?.activeBranch === newState) {
    return state;
  }

  if (state) {
    state.context.unlisten();
    parentContext.removeChild(state.context);
  }

  const context = untracked(() => conditionalBlockFn(parentNode, parentContext, anchor));
  parentContext.addChild(context);

  return { 
    activeBranch: newState, 
    context 
  };
}

/**
 * Handles the case where no branch condition matched: tears down the previously
 * active branch, if one existed, by unlistening its context (running cleanup
 * functions and destroying its subtree) and detaching it from the parent context.
 * A no-op if no branch was previously active.
 *
 * @param parentContext - The parent Context from which the previous branch's
 *   context should be detached.
 * @param state - The current state (active branch index and its context), or
 *   `undefined` if no branch is currently active.
 */
function teardown(parentContext: Context, state: State | undefined): void {
  if (state) {
    state.context.unlisten();
    parentContext.removeChild(state.context);
  }
}