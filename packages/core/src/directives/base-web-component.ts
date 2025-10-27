export class BaseWebComponent extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
}