/**
 * Indents each line of a code block by two spaces.
 *
 * @param lines - The line or lines of code to indent.
 * @returns The indented line, or an array of indented lines.
 */
export function indent(lines: string): string;
export function indent(lines: string[]): string[];
export function indent(lines: string | string[]): string | string[] {
  return typeof lines === 'string' ? `  ${lines}` : lines.map(line => `  ${line}`);
} 