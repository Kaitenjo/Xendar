import { INTERNAL_SELECTORS } from "../costants";
import { BaseWebComponentConstructor } from "../models/base-web-component-constructor.type";

/**
 * Base class for all Web Components in the framework
 * 
 * This class internally has an `observedAttributes` property
 * add programmaticaly by the @WebComponent decorator. 
 * It won't appear by intellisense but it's there.
 */
export abstract class BaseWebComponent extends HTMLElement {
  /**
   * Flag to track if the component has been initialized
   * When istance is created, the flag is false
   * After the connectedCallback has been called and all the attributes
   * have been reflected on the relatives properties, the flag is set to true
   * 
   * This prevents the render method to be called by the properties setters
   * before the component is fully initialized.
   * 
   * Otherwise the render function would be called N times where N is the
   * number of properties decorated with @Property and specified as attributes
   * on the CustomElement tag in the HTML
  */
 private _initialized = false;
 
 private readonly _root: ShadowRoot;
 
 public static rendererTimes = 0;

 constructor() {
   super();
   this.addHostClass()
   this._root = this.attachShadow({ mode: 'open' });
  }
  
  public abstract render(): string;
 
  public abstract css(): string;
  
  /**
   * Method called by the @Property decorator to
   * update the rendering of the component
   * @internal 
   */
  public internalRender(): void {
    if (this._initialized) {
      console.warn('Render times:', ++BaseWebComponent.rendererTimes);
      this._root.innerHTML = `${this.render()} <style>${this.css()}</style>`;
    }
  }

  /**
   * Retrieve the selectors defined on the class through the @WebComponent decorator
   * and add them as class(es) on the host element
   * 
   * This allows to use the selector as CSS class root in the `css` method 
   * and support BEM methodology
   */
  private addHostClass(): void {
    const selectors = (this.constructor as BaseWebComponentConstructor)[INTERNAL_SELECTORS];
    Array.isArray(selectors)
      ? this.classList.add(...selectors)
      : this.classList.add(selectors);
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
    context[name] = newValue;
  }

  /**
   * Method automatically called by the JavascriptEngine when a CustomElement
   * is added to the DOM
   * 
   * This method is called EVERY time the element is added
   */
  private connectedCallback(): void {
    this._initialized = true;
    this.internalRender();
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
    this._initialized = false
  }
}