import { TypeCheckResult } from '@xaendar/compiler';
import { Position } from 'vscode';
import { TextDocument } from 'vscode-languageserver-textdocument';

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
export function mapTemplatePositionToShim(mappingTable: TypeCheckResult['mappingTable'], bodyLineOffset: number, templateDocument: TextDocument, position: { line: number, character: number }): { line: number, character: number } | undefined {
  const charIndex = templateDocument.offsetAt(new Position(position.line, position.character));

  for (const [shimLine, lineMappings] of mappingTable) {
    for (const mapping of lineMappings) {
      if (charIndex >= mapping.original.start && charIndex < mapping.original.end) {
        const offsetInSpan = charIndex - mapping.original.start;
        const shimColumn = mapping.columnStart + offsetInSpan;
        return shimColumn >= mapping.columnEnd ? { line: shimLine + bodyLineOffset, character: shimColumn } : undefined;
      }
    }
  }

  return undefined;
}