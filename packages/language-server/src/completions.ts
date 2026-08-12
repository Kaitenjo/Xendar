import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver/node';
import { getLanguageService } from '@xaendar/language-core';
import { getCompiledTemplate } from './document-manager';
import { mapTemplatePositionToShim } from './position-mapping';
import { CompilerOptions, ScriptElementKind } from 'typescript';

export function getCompletions(
  templateUri: string,
  templateSource: string,
  position: Position,
  compilerOptions: CompilerOptions
): CompletionItem[] {
  const compiled = getCompiledTemplate(templateUri);
  if (!compiled) return [];

  const shimPosition = mapTemplatePositionToShim(
    compiled.typecheckBody.mappingTable,
    compiled.bodyLineOffset,
    templateSource,
    position
  );
  if (!shimPosition) return []; // cursore su markup statico, non su un'espressione

  const languageService = getLanguageService(compilerOptions);
  const shimSourceFile = languageService.getProgram()?.getSourceFile(compiled.shimPath);
  if (!shimSourceFile) return [];

  const offset = shimSourceFile.getPositionOfLineAndCharacter(shimPosition.line, shimPosition.character);
  const tsCompletions = languageService.getCompletionsAtPosition(compiled.shimPath, offset, {});
  if (!tsCompletions) return [];

  return tsCompletions.entries.map(entry => ({
    label: entry.name,
    kind: mapKind(entry.kind),
    sortText: entry.sortText,
    // Il testo di inserimento va bene com'è: siamo dentro un'espressione TS
    // già delimitata da {}, quindi non serve remapparlo — è testo puro,
    // non uno span da tradurre indietro nel template.
  }));
}

function mapKind(kind: ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case ScriptElementKind.memberVariableElement: return CompletionItemKind.Field;
    case ScriptElementKind.memberFunctionElement: return CompletionItemKind.Method;
    case ScriptElementKind.functionElement: return CompletionItemKind.Function;
    default: return CompletionItemKind.Text;
  }
}