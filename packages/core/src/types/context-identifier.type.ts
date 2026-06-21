import { NoArgsFunction } from '@xaendar/types'

/**
 * Represents a named variable binding within a template execution scope.
 *
 * Held by a {@link Context} instance, each identifier exposes a getter
 * function that returns the current value of the variable and a flag
 * indicating whether the value is reactive (i.e. should be wrapped in an
 * effect when used in attribute bindings or text interpolations).
 *
 * @template ReturnType - The type of the value returned by the getter.
 */
export type ContextIdentifier<ReturnType = unknown> = {
  /** 
   * Retrieves the current value of the identifier. 
   */
  get: NoArgsFunction<ReturnType>,
  /** 
   * Whether the identifier's value may change reactively over time. 
   */
  reactive: boolean
}