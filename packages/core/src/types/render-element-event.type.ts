import { Function } from "@xaendar/types"

/**
 * Describes a single DOM event listener to be attached to a rendered element.
 */
export type RenderElementEvent = {
  /** 
   * The DOM event name (e.g. `click`, `input`). 
   */
  name: string,
  /** 
   * The name of the handler method on the component class to invoke when the event fires. 
   */
  handler: string
  /**
   * Event Parameters
   */
  parameters: Function<[Event], unknown>[]
}