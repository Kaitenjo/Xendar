import { LineMapping } from "./generated-line.type";

export type TypeCheckResult = {
  /** 
   * Typescript Shim Source 
   */
  text: string;
  /** 
   * Table to map Shim's rows to the original template rows
   */
  mappingTable: ReadonlyMap<number, readonly LineMapping[]>;
}
