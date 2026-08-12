import { Cursor, TypeCheckResult } from '@xaendar/compiler';

/**
 * Converte una posizione nel template DSL (line/character) nella posizione
 * corrispondente nello shim TS generato, usando la mappingTable prodotta
 * dal compilatore. È l'inverso di `resolveTemplateSpan` usata per le
 * diagnostics.
 *
 * @param mappingTable - La mapping table prodotta da `compile()`.
 * @param bodyLineOffset - Numero di righe di prefisso dello shim
 *   (import + declare const root) da sommare all'offset trovato.
 * @param templateSource - Sorgente del template, per convertire
 *   line/character in un indice di carattere assoluto.
 * @param position - Posizione nel template (0-based, come da LSP).
 * @returns La posizione nello shim, o `undefined` se il punto non cade
 *   dentro nessuna espressione mappata (es. testo statico HTML).
 */
export function mapTemplatePositionToShim(
  mappingTable: TypeCheckResult['mappingTable'],
  bodyLineOffset: number,
  templateSource: string,
  position: { line: number; character: number }
): { line: number; character: number } | undefined {
  const cursor = new Cursor(templateSource);
  const charIndex = cursor.getCharacterIndexFromPosition(position);

  // La mappingTable contiene entry { templateStart, templateEnd, shimStart }
  // per ogni span di espressione compilata (es. "{sidebarCollapsed()}").
  // Cerchiamo quella che contiene il cursore.
  const entry = mappingTable.find(e => charIndex >= e.templateStart && charIndex <= e.templateEnd);
  if (!entry) return undefined;

  const offsetInExpr = charIndex - entry.templateStart;
  const shimCharIndex = entry.shimStart + offsetInExpr;

  // bisogna poi convertire shimCharIndex (assoluto nel body) in line/character
  // sommando bodyLineOffset e usando lo stesso helper di Cursor sullo shim
  return shimIndexToLineCharacter(shimCharIndex, bodyLineOffset);
}