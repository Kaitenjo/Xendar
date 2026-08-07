// types/generated-line.type.ts

import { Span } from '../../types/span.type';

/** 
 * Maps a column range in the generated shim back to its originating span in the template source. 
 */
export type LineMapping = {
  /** 
   * Inclusive start column in the generated line. 
   */
  columnStart: number;
  /** 
   * Exclusive end column in the generated line. 
   */
  columnEnd: number;
  /** 
   * Corresponding span in the original template source. 
   */
  original: Span;
}

/** 
 * A single line of generated TypeScript together with optional source-map entries. 
 */
export type Line = {
  /** 
   * The generated TypeScript text for this line (no trailing newline). 
   */
  text: string;
  /** 
   * Source-map entries for tokens on this line; absent when the line has no mappable spans. 
   */
  mappings?: LineMapping[];
}