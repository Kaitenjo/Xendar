/**
 * Configuration object accepted by the `@WebComponent` decorator.
 */
export type WebComponentDecoratorParams = {
  /** 
   * The custom element selector (or an array of selectors) used to register the component in the browser. 
   */
  selector: string | string[],
  /** 
   * Optional path to the component's stylesheet, relative to the component file. 
   */
  styleUrl?: string
  /** 
   * Path to the component's HTML template, relative to the component file. 
   */
  templateUrl: string
}