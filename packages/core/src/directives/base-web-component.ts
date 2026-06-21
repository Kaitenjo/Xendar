import { NoArgsVoidFunction } from "@xaendar/types";
import { isInputSignal } from "../signals/input/input-instance.symbol";
import { INPUT_SIGNAL_SET_SYMBOL } from "../signals/input/input-set.symbol";
import { Context } from "../utils";

/**
 * Base class for all web components in the framework.
 *
 * Extends `HTMLElement` with Shadow DOM support and the lifecycle hooks
 * required for signal-based rendering. Concrete component classes should
 * extend this class and be decorated with `@WebComponent`.
 *
 * The `observedAttributes` static getter is added programmatically by the
 * `@WebComponent` decorator and will not appear in IDE autocompletion, but
 * it is present at runtime.
 */
export class BaseWebComponent extends HTMLElement {

  [key: string]: unknown;
  
  /**
   * The active template execution context for this component instance,
   * holding all identifier bindings and registered cleanup functions.
   */
  protected context!: Context;

  /**
   * The root of the Web Component, where the content is rendered
   */
  private readonly _root: ShadowRoot;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  /**
   * Initialises the component's Shadow DOM render tree.
   *
   * Overridden by the compiler-generated code injected via the `@WebComponent`
   * decorator pipeline. Returns an array of effect disposer functions that
   * should be called when the component is disconnected.
   *
   * @internal
   */
  private _render(): NoArgsVoidFunction[] { 
    return [];
  }

  /**
   * Called by the browser engine when an observed attribute on the host
   * element is added, changed, or removed.
   *
   * This callback may fire before `connectedCallback` if the attribute is
   * already present on the element at parse time.
   *
   * @param name - The name of the attribute that changed.
   * @param _oldValue - The previous value of the attribute (unused).
   * @param newValue - The new value of the attribute.
   */
  private attributeChangedCallback(name: string, _oldValue: unknown, newValue: unknown): void {
    /*
      Since the 'Property Decorator add the property key to the ObservedAttributes
      We are sure that the property with the given name exists on the instance of the subclass
    */
    const context = this as BaseWebComponent & Record<string, unknown>;
    if (!(name in context)) {
      throw new Error(`Attribute ${name} is not associated to any property`);
    }


    /*
      @Property decorator types ensure that the property associated to the attribute is an InputSignal
      but i prefer to check it at runtime anyway to avoid any possible error in the future 
      if the decorator is used wrong or if the types are not respected for some reason 
     */
    if (!isInputSignal(context[name])) {
      throw new Error(`Property ${name} is not an InputSignal`);
    }

    context[name].set(newValue, INPUT_SIGNAL_SET_SYMBOL);
  }

  /**
   * Called by the browser engine each time the element is inserted into the DOM.
   *
   * Triggers the initial render by calling `_render()`, which builds the
   * Shadow DOM tree and sets up reactive signal subscriptions.
   */
  private connectedCallback(): void {
    this.unwatchFns = this._render();
  }

  /**
   * Called by the browser engine each time the element is removed from the DOM.
   *
   * Invokes `context.unlisten()` to dispose all active signal subscriptions,
   * detach event listeners, and remove tracked DOM nodes so the component
   * can be cleanly re-rendered if it is re-inserted.
   */
  private disconnectedCallback(): void {
    this.context.unlisten();
  }
}