import { getLanguageService } from '@xaendar/language-core';
import { CompilerOptions, ScriptElementKind } from 'typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, Position } from 'vscode-languageserver/node';
import { getCompiledTemplate } from './document-manager';
import { mapTemplatePositionToShim } from './position-mapping';

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

function mapKind(kind: ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case ScriptElementKind.memberVariableElement: return CompletionItemKind.Field;
    case ScriptElementKind.memberFunctionElement: return CompletionItemKind.Method;
    case ScriptElementKind.functionElement: return CompletionItemKind.Function;
    default: return CompletionItemKind.Text;
  }
}