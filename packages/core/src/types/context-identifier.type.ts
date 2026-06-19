import { NoArgsFunction } from '@xaendar/types'

export type ContextIdentifier<ReturnType = unknown> = {
  get: NoArgsFunction<ReturnType>,
  reactive: boolean
}