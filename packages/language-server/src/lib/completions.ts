import { TypeCheckResult } from '@xaendar/compiler';
import { getLanguageService } from '@xaendar/language-core';
import { CompilerOptions, ScriptElementKind } from 'typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver/node';
import { getCompiledTemplate } from './document-manager';

/**
 * Returns completion items for the template position by querying the
 * TypeScript language service for the generated shim.
 *
 * @param templateUri - URI of the template document.
 * @param templateDocument - Template document containing the requested position.
 * @param position - Zero-based LSP position in the template.
 * @param compilerOptions - TypeScript compiler options for the component project.
 * @returns Completion items, or an empty array when the position cannot be mapped
 *   or the language service has no suggestions.
 */
export function getCompletions(templateUri: string, templateDocument: TextDocument, position: Position, compilerOptions: CompilerOptions): CompletionItem[] {
  const compiled = getCompiledTemplate(templateUri);
  if (!compiled) {
    return [];
  }

  const shimPosition = mapTemplatePositionToShim(compiled.typecheckBody.mappingTable, compiled.bodyLineOffset, templateDocument, position);
  if (!shimPosition) {
    return [];
  }

  const languageService = getLanguageService(compilerOptions);
  const shimSourceFile = languageService.getProgram()?.getSourceFile(compiled.shimPath);
  if (!shimSourceFile) {
    return [];
  }

  const offset = shimSourceFile.getPositionOfLineAndCharacter(shimPosition.line, shimPosition.character);
  const tsCompletions = languageService.getCompletionsAtPosition(compiled.shimPath, offset, {});
  if (!tsCompletions) {
    return [];
  }

  return tsCompletions.entries.map(entry => ({
    label: entry.name,
    kind: mapKind(entry.kind),
    sortText: entry.sortText,
  }));
}

/**
 * Maps a TypeScript script element kind to its corresponding LSP completion kind.
 *
 * @param kind - TypeScript script element kind.
 * @returns The matching LSP completion item kind.
 */
function mapKind(kind: ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case ScriptElementKind.memberVariableElement: return CompletionItemKind.Field;
    case ScriptElementKind.memberFunctionElement: return CompletionItemKind.Method;
    case ScriptElementKind.functionElement: return CompletionItemKind.Function;
    default: return CompletionItemKind.Text;
  }
}

/**
 * Converts a position in the DSL template (line/character) to the
 * corresponding position in the generated TypeScript shim using the mapping
 * table produced by the compiler. This is the inverse of
 * `resolveTemplateSpan`, which is used for diagnostics.
 *
 * @param mappingTable - Mapping table produced by `compile()`.
 * @param bodyLineOffset - Number of shim prefix lines (the import and
 *   `declare const root`) to add to the mapped line.
 * @param templateDocument - Template document used to convert the line and
 *   character position into an absolute character offset.
 * @param position - Zero-based LSP position in the template.
 * @returns The position in the shim, or `undefined` when the position does not
 *   fall inside a mapped expression, such as static HTML text.
 */
export function mapTemplatePositionToShim(mappingTable: TypeCheckResult['mappingTable'], bodyLineOffset: number, templateDocument: TextDocument, position: { line: number, character: number }): { line: number, character: number } | undefined {
  const charIndex = templateDocument.offsetAt(position);

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