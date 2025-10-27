import { BaseWebComponent, Property, WebComponent } from '@xendar/core'
import { INTERNAL_OBSERVED_ATTRIBUTES } from 'packages/core/src/costants';

@WebComponent('xendar-text-input')
export class XendarTextInput extends BaseWebComponent {

  @Property
  public name = 'Xendar';
  
  @Property
  public cazzo = 'Cazzo';

  @Property
  public culo = 'Cazzo';

   constructor() {
    super();
    console.log((XendarTextInput as any)['observedAttributes']);
   }
}