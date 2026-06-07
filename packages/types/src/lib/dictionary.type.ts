export type Dictionary<Key extends string | number, Value = string> = {
  [K in Key]?: Value
}