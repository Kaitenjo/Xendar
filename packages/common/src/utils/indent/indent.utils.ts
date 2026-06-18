/**
 * Indents each line of a code block by two spaces.
 * @param lines The lines of code to indent.
 * @return The indented line or an array of indented lines.
 */
export function indent(lines: string): string;
export function indent(lines: string[]): string[];
export function indent(lines: string | string[]): string | string[] {
  return typeof lines === 'string' ? `  ${lines}` : lines.map(line => `  ${line}`);
} 