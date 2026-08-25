import { TypeCheckResult } from '@xaendar/compiler';

export type CompiledTemplate = {
  typecheckBody: TypeCheckResult;
  shimPath: string;
  bodyLineOffset: number;
  classNames: string[];
}