import { BaseWebComponent, Property, WebComponent } from '@xendar/core';

@WebComponent('xendar-text-input')
export class XendarTextInput extends BaseWebComponent {

  @Property({ required: true })
  public accessor id!: string;

  @Property()
  public accessor label = '';

  @Property()
  public accessor value = '';

  @Property()
  public accessor placeholder = 'Type here...';

  public render(): string {
    return `
      <label
        for="${this.id}"
        aria-label="${this.label}"
      >
        ${this.label}
      </label>
      <input 
        id="${this.id}"
        type="text" 
        value="${this.value}" 
        placeholder="${this.placeholder}" 
      />
      `
  }

  public css(): string {
    return `
      :host {
        display: flex;
        flex-direction: column;
        font-family: Arial, sans-serif;
        gap: 0.25rem;
        height: auto;
        width: 15rem;

        input {
          border: 2px solid #ccc;
          border-radius: 0.5rem;
          padding: 0.5rem;

          &:focus-visible {
            border-color:rgb(0, 170, 255);
            outline: none;
          }
        }

        label {
          font-weight: bold;
          margin-left: 0.2rem;
        }
      }
    `
  }
}