import { NoArgsVoidFunction } from '@xaendar/types';
import { Context } from './context.utils';
import { effect } from '../signals/effect/effect';

/**
 * 
 * @param parentNode 
 * @param text 
 * @param context 
 * @returns 
 */
export function renderText(parentNode: HTMLElement, text: string, context: Context): { element: Text, unwatchFns: NoArgsVoidFunction[]  } {
  const identifier = context.getIdentifier<string>(text)!;
  const node = document.createTextNode(identifier.get());
  parentNode.appendChild(node);

  const retVal: { element: Text, unwatchFns: NoArgsVoidFunction[]  } = {
    element: node,
    unwatchFns: [
      () => parentNode.removeChild(node) 
    ]
  }

  if (identifier.reactive) {
    retVal.unwatchFns.push(effect(() => node.textContent = identifier.get()))
  }

  return retVal;
}

/**
 * 
 * @param parentNode 
 * @param text 
 * @param context 
 * @returns 
 */
export function renderLiteralText(parentNode: HTMLElement, text: string): { element: Text, unwatchFns: NoArgsVoidFunction[]  } {
  const node = document.createTextNode(text);
  parentNode.appendChild(node);
  return {
    element: node,
    unwatchFns: [
      () => parentNode.removeChild(node) 
    ]
  }
}