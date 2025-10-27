import { BaseWebComponent, WebComponent } from '@xendar/core'

@WebComponent({
  selectors: 'xendar-button',
  attributes: ['text']
})
export class XendarTextButton extends BaseWebComponent {}

@WebComponent({
  selectors: 'xendar-text-input',
  attributes: ['label']
})
export class XendarTextInput extends BaseWebComponent {

  public name = 123;
  
  public get value(): string {
    return this.inputElement.value;
  }
  public set value(val: string) {
    this.setAttribute("value", val ?? "");
  }

  private readonly inputElement: HTMLInputElement;

  private readonly labelElement: HTMLLabelElement;

  constructor() {
    super();
    
    const container = document.createElement("div");
    container.innerHTML = `
      <style>npms t
        :host {
          di3splay: flex;
          flex-direction: column;
          gap: 4px;
          font-family: sans-serif;
        }

        label {
          font-size: 14px;
          color: #33;
        }

        input {
          padding: 8px 10px;
          border: 1px solid #aaa;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        input:focus {
          border-color: #0078ff;
        }
      </style>

      <label></label>
      <input type="text" />
    `;

    this.shadowRoot!.appendChild(container);

    this.labelElement = this.shadowRoot!.querySelector("label")!;
    this.inputElement = this.shadowRoot!.querySelector("input")!;

    this.inputElement.addEventListener("input", () => {
      this.value = this.inputElement.value;
      this.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  public attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    switch (name) {
      case "label":
        this.labelElement.textContent = newValue ?? '';
        break;
      case "placeholder":
        this.inputElement.placeholder = newValue ?? '';
        break;
      case "value":
        this.inputElement.value = newValue ?? '';
        break;
    }
  }

  public connectedCallback(): void {
    this.applyAttribute("label");
    this.applyAttribute("placeholder");
    this.applyAttribute("value");
  }

  private applyAttribute(attr: string): void {
    if (this.hasAttribute(attr)) {
      this.attributeChangedCallback(attr, null, this.getAttribute(attr));
    }
  }
}