import { Span } from '../../types/span.type.js';
import { TypeCheckResult } from '../types/type-checker-result.type.js';

/**
 * Given a {line, character} position in the generated shim (0-based, same
 * convention as `ts.getLineAndCharacterOfPosition`), resolves the
 * corresponding span in the original template.
 *
 * Returns `undefined` if the line has no mapping at all (e.g. a purely
 * structural/boilerplate line: `function typeCheck() {`, `}`, the
 * unmapped part of `for (...) {`, etc.) — in that case it's best to fall
 * back to the nearest enclosing node, if tracked elsewhere, or to show the
 * "raw" error on the shim line itself.
 */
export function resolveTemplateSpan(table: TypeCheckResult['mappingTable'], position: { line: number, character: number }): Span | undefined {
  const mappings = table.get(position.line);
  if (mappings) {
    const exact = mappings.find(mapping => position.character >= mapping.columnStart && position.character < mapping.columnEnd);
    if (exact) return exact.original;
  
    return mappings.reduce((closest, mapping) => {
      const dist = Math.min(Math.abs(position.character - mapping.columnStart), Math.abs(position.character - mapping.columnEnd));
      const closestDist = Math.min(Math.abs(position.character - closest.columnStart), Math.abs(position.character - closest.columnEnd));
      return dist < closestDist ? mapping : closest;
    }).original;
  }
}