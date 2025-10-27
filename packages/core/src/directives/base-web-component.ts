export class BaseWebComponent extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  public render(): void {
    console.log('Base render method called');
  }
}