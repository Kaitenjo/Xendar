import { BaseWebComponent, Property, WebComponent } from '@xendar/core';

@WebComponent('xendar-text-input')
export class XendarTextInput extends BaseWebComponent {

  @Property
  public accessor name = 'Xendar';

  @Property
  public accessor value = '';

  @Property
  public accessor placeholder = 'Type here...';

  @Property
  public accessor hinttext: string | undefined;

  @Property
  public accessor items = ['Item 1', 'Item 2', 'Item 3'];

  
  public render(): string {
    return `
      <input
        id="${this.name}"
        type="text" 
        name="${this.name}" 
        value="${this.value}" 
        placeholder="${this.placeholder}" 
      />
      <label for="${this.name}">${this.name}</label>SS
      ${IfElse(
        this.hinttext, 
        `<small>${this.hinttext}</small>`,
        'No hint provided.'
      )}
      ${Switch(this.name, {
        Xendar: '<p>This is Xendar</p>',
        Admin: '<p>Welcome Admin</p>',
        default: '<p>Unknown user</p>'
      })}
      ${For(this.items, (item, index) => `<div>${index + 1}. ${item}</div>`)}
    `
  }
}

function If(predicate: unknown, code: string): string {
  return !!predicate ? code : '';
}

function IfElse(predicate: unknown, truePredicate: string, falsePredicate: string): string {
  return !!predicate ? truePredicate : falsePredicate;
}

function For<T>(arr: T[], template: (item: T, index: number) => string): string {
  return arr.map(template).join('');
}

function Switch<T extends string | number = string>(value: T, cases: Record<T, string> & { default?: string }): string {
  return cases[value] ?? cases.default ?? '';
}