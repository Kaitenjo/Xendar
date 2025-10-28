import { BaseWebComponent, Property, WebComponent } from '@xendar/core'
import { INTERNAL_OBSERVED_ATTRIBUTES } from 'packages/core/src/costants';

@WebComponent('xendar-text-input')
export class XendarTextInput extends BaseWebComponent {

  @Property
  public accessor name = 'Xendar';
  
  @Property
  public accessor cazzo = 'Cazzo';

  @Property
  public accessor culo = 'Cazzo';

   constructor() {
    super();
    console.log((XendarTextInput as any)['observedAttributes']);
   }
}