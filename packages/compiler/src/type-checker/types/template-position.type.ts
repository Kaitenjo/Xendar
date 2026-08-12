/**
 * A 0-based {line, character} position, using the same convention as
 * `ts.getLineAndCharacterOfPosition`.
 */
export interface TemplatePosition {
  line: number;
  character: number;
}