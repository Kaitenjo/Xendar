// utils/line-builder.utils.ts
import { Span } from '../../types/span.type.js';
import { Line, LineMapping } from '../types/generated-line.type.js';

type Part = string | { text: string; original: Span };

/** Marks a text fragment as originating from a span in the template source. */
export function mapped(text: string, original: Span): { text: string; original: Span } {
  return { text, original };
}

/**
 * Composes a single line from static string parts and mapped parts.
 * Each mapping's column is computed from the length of text already
 * accumulated — no `indexOf`, no risk of matching the wrong occurrence
 * of a repeated substring.
 */
export function line(...parts: Part[]): Line {
  let text = '';
  const mappings: LineMapping[] = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      text += part;
      continue;
    }
    const columnStart = text.length;
    text += part.text;
    mappings.push({ columnStart, columnEnd: text.length, original: part.original });
  }

  return mappings.length ? { text, mappings } : { text };
}

/** Purely structural line with no source mappings (boilerplate). */
export function plain(text: string): Line {
  return { text };
}