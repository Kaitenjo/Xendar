import { NoArgsVoidFunction } from "@xaendar/types";
import { isInputSignal } from "../signals/input/input-instance.symbol";
import { INPUT_SIGNAL_SET_SYMBOL } from "../signals/input/input-set.symbol";

/**
 * Base class for all Web Components in the framework
 * 
 * This class internally has an `observedAttributes` property
 * add programmaticaly by the @WebComponent decorator. 
 * It won't appear by intellisense but it's there.
 */
export class BaseWebComponent extends HTMLElement {
  /**
   * Array of functions to unwatch all the signals used in the component
   */
  protected unwatchFns = new Array<NoArgsVoidFunction>;

  /**
   * The root of the Web Component, where the content is rendered
   */
  private readonly _root: ShadowRoot;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  /**
   * Method called by the @Property decorator to
   * update the rendering of the component
   * @internal 
   */
  private _render(): NoArgsVoidFunction[] { 
    return [];
  }

  /**
   * Method automatically called by the JavascriptEngine when an attribute
   * on the host element is changed
   * 
   * This method runs before the connectedCallback method if any observed attribute
   * is specified on the CustomElement tag in the HTML
   * 
   * @param name Name of the attribute changed
   * @param _oldValue Old value of the attribute
   * @param newValue New value of the attribute
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
   * Method automatically called by the JavascriptEngine when a CustomElement
   * is added to the DOM
   * 
   * This method is called EVERY time the element is added
   */
  private connectedCallback(): void {
    this.unwatchFns = this._render();
  }

  /**
   * Method automatically called by the JavascriptEngine when a CustomElement
   * is removed from the DOM
   * 
   * This method is called EVERY time the element is removed
   * 
   * We use this method to reset the _initialized flag
   * so that if the element is re-added to the DOM
   * the properties initialization won't call the render method
   */
  private disconnectedCallback(): void {
    this.unwatchFns.forEach(unwatch => unwatch());
    this.unwatchFns = [];
  }
}