import { NoArgsFunction } from '@xaendar/types';
import { effect } from '../signals/effect/effect';
import { Context, mountNode } from './context.util';

/**
 * Creates a reactive text node bound to a named identifier in the current scope.
 *
 * Appends a `Text` node to `parentNode` with the initial value of the identifier.
 * If the identifier is reactive, wraps the text update in an effect so the node
 * content is kept in sync whenever the underlying signal changes.
 *
 * @param parentNode - The parent HTML element to append the text node to.
 * @param context - The current template execution scope used to resolve `text`.
 * @param text - The identifier name to resolve as the text content.
 */
export function _renderText(parentNode: HTMLElement, context: Context, textFn: NoArgsFunction<string>): void {
  const node = document.createTextNode(textFn());
  mountNode(node, parentNode, context);
  context.listen(effect(() => node.textContent = textFn()));
}

/**
 * Creates a static (non-reactive) text node with a literal string value.
 *
 * Appends a `Text` node containing `text` directly to `parentNode` and
 * registers a cleanup function that removes the node when the context is
 * destroyed.
 *
 * @param parentNode - The parent HTML element to append the text node to.
 * @param context - The current template execution scope.
 * @param text - The literal string to render as text content.
 */
export function _renderLiteralText(parentNode: HTMLElement, context: Context, text: string): void {
  const node = document.createTextNode(text);
  mountNode(node, parentNode, context);
}