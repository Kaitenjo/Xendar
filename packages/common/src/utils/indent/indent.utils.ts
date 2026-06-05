/**
 * Indents each line of a code block by two spaces.
 * @param lines The lines of code to indent.
 * @return An array of indented lines.
 */
export function indent(...lines: string[]): string[] {
  return lines.map(line => `  ${line}`);
} 