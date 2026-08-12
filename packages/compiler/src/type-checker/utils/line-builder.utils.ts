import { Span } from '../../types/span.type.js';
import { Line, LineMapping } from '../types/generated-line.type.js';

type Part = string | { text: string; span: Span };

/** 
 * Marks a text fragment as originating from a span in the template source. 
 */
export function mapped(text: string, span: Span): Part {
  return { text, span };
}

/**
 * Composes a single line from static string parts and mapped parts.
 * Each mapping's column is computed from the length of text already
 * accumulated — no `indexOf`, no risk of matching the wrong occurrence
 * of a repeated substring.
 */
export function line(...parts: Part[]): Line {
  let text = '';
  const mappings = new Array<LineMapping>();

  for (const part of parts) {
    if (typeof part === 'string') {
      text = `${text}${part}`;
    } else {
      const columnStart = text.length;
      text = `${text}${part.text}`;
      mappings.push({ columnStart, columnEnd: text.length, original: part.span });
    }
  }

  return mappings.length ? { text, mappings } : { text };
}

/** 
 * Purely structural line with no source mappings (boilerplate). 
 */
export function plain(text: string): Line {
  return { text };
}

export function indentLines(lines: Line[]): Line[] {
  return lines.map(line => ({
    text: ' '.repeat(2) + line.text,
    mappings: line.mappings?.map(mapping => ({
      ...mapping,
      columnStart: mapping.columnStart + 2,
      columnEnd: mapping.columnEnd + 2,
    })),
  }));
}