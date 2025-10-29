import { BaseWebComponent, Property, WebComponent } from '@xendar/core';

@WebComponent('xendar-text-input')
export class XendarTextInput extends BaseWebComponent {

  @Property
  public accessor id = '';

  @Property
  public accessor name = 'Xendar';
  
  @Property
  public accessor value = '';

  @Property
  public accessor placeholder = 'Type here...';

  public render(): void {
    this.innerHTML = `
      <input 
        for="${this.name}"
        type="text" 
        name="${this.name}" 
        value="${this.value}" 
        placeholder="${this.placeholder}" 
      />
      <label id="${this.name}">${this.name}</label>
    `
  }
}