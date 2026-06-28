export type GeneratorTransitionFunctionReturnType = {
  code: string[],
  functionsToProcess?: Map<string, {
    fn: string[],
    args: string[]
  }>
}