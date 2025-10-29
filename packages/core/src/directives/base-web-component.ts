import { Constructor } from "@xendar/common";
import { INTERNAL_PREFIX } from "../costants";

export abstract class BaseWebComponent extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  public attributeChangedCallback(name: string, _oldValue: unknown, newValue: unknown): void {
    /*
      Since the 'Property Decorator add the property key to the ObservedAttributes
      We are sure that the property with the given name exists on the instance of the subclass
    */
    const context = this as BaseWebComponent & Record<string, unknown>; 
    context[name] = newValue;
  }

  /**
   * Method automatically called by the JavascriptEngine when a CustomElement
   * is added to the DOM
   * 
   * This method is called EVERY time the element is added:
   */
  public connectedCallback(): void {
    const constructor = (this.constructor as Constructor<BaseWebComponent, { observedAttributes: string[]}>)
    for (const attribute of constructor.observedAttributes) {
      const attributeValue = this.getAttribute(attribute);
      if (attributeValue) {
        this.attributeChangedCallback(attribute, null, attributeValue);
      }
    }
    this.render();
  }

  public abstract render(): void;
}