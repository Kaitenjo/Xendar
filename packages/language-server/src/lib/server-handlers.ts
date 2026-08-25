import { TypeCheckResult } from '@xaendar/compiler';
import { getLanguageService, loadCompilerOptions } from '@xaendar/language-core';
import { VoidFunction } from '@xaendar/types';
import { dirname } from 'node:path';
import { Diagnostic, DiagnosticCategory, ScriptElementKind } from 'typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, CompletionParams, Connection, DiagnosticSeverity, DidChangeWatchedFilesParams, FileChangeType, HandlerResult, InitializeError, InitializeParams, InitializeResult, Diagnostic as LSPDiagnostic, Position, TextDocumentSyncKind, TextDocuments } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { compileTemplate } from './document-manager';
import { buildComponentIndex, indexComponent, removeComponentFromIndex, resolveComponentForTemplate } from './template-registry';

/**
 * Initializes language server capabilities and captures workspace roots.
 *
 * @param params - LSP initialize request parameters.
 * @param setWorkspaceRoots - Callback used to persist resolved workspace root paths.
 * @returns The language server initialize result.
 */
export function onInitialize(params: InitializeParams, setWorkspaceRoots: (roots: string[]) => void): HandlerResult<InitializeResult, InitializeError> {
  const workspaceFolders = params.workspaceFolders;
  if (workspaceFolders?.length) {
    setWorkspaceRoots(workspaceFolders.map(folder => fromUri(folder.uri)));
  }

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ['.', '{', '('] },
      hoverProvider: true,
    }
  };
}

/**
 * Performs post-initialization indexing for all workspace roots.
 *
 * @param workspaceRoots - Root directories that should be indexed.
 */
export async function onInitialized(workspaceRoots: string[]): Promise<void> {
  await buildComponentIndex(workspaceRoots);
}

/**
 * Updates the in-memory component index when watched component files change.
 *
 * @param event - File watcher event payload from the language client.
 */
export function onDidChangeWatchedFiles(event: DidChangeWatchedFilesParams): void {
  for (let i = 0; i < event.changes.length; i++) {
    const change = event.changes[i];
    const path = fromUri(change.uri);
    if (path.endsWith('.xd.component.ts')) {
      change.type === FileChangeType.Deleted ? removeComponentFromIndex(path) : indexComponent(path);
    }
  }
}

/**
 * Computes completion items for a template document position.
 *
 * @param params - Completion request parameters.
 * @param documents - Open text document collection managed by the server.
 * @returns Completion items for the requested position.
 */
export async function onCompletion(params: CompletionParams, documents: TextDocuments<TextDocument>): Promise<CompletionItem[]> {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    return [];
  }

  const templatePath = fromUri(params.textDocument.uri);
  const componentPaths = resolveComponentForTemplate(templatePath);
  if (!componentPaths) {
    return [];
  }

  const compiled = await compileTemplate(templatePath, doc.getText(), componentPaths);
  const shimPosition = mapTemplatePositionToShim(compiled.typecheckBody.mappingTable, compiled.bodyLineOffset, doc, params.position);
  if (!shimPosition) {
    return [];
  }

  const compilerOptions = loadCompilerOptions(dirname(templatePath));
  const languageService = getLanguageService(compilerOptions);
  // Assertion is safe because recompileTemplate registers the generated shim in the language service.
  const shimSourceFile = languageService.getProgram()?.getSourceFile(compiled.shimPath)!;
  const offset = shimSourceFile.getPositionOfLineAndCharacter(shimPosition.line, shimPosition.character);
  const tsCompletions = languageService.getCompletionsAtPosition(compiled.shimPath, offset, {});

  return tsCompletions ? tsCompletions.entries.map(entry => ({
    label: entry.name,
    kind: mapKind(entry.kind),
    sortText: entry.sortText,
  })) : [];
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
}

/**
 * Maps a TypeScript script element kind to an LSP completion item kind.
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

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Creates a debounced function that maintains an independent timer for each key.
 *
 * @param fn - Function to invoke after the delay.
 * @param ms - Delay in milliseconds.
 * @returns A function that schedules an invocation for the supplied key.
 */
export function debounce(fn: VoidFunction<[key: string, document: TextDocument, connection: Connection]>, ms: number): VoidFunction<[key: string, document: TextDocument, connection: Connection]> {

  return (key: string, document: TextDocument, connection: Connection) => {
    const existing = timers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    timers.set(key, setTimeout(() => {
      timers.delete(key);
      fn(key, document, connection);
    }, ms));
  };
}

/**
 * Validates a template by compiling it and forwarding TypeScript diagnostics
 * from its generated shim to the language client.
 *
 * @param uri - URI of the changed document.
 * @param document - Changed template document.
 * @param connection - Active language server connection used to publish diagnostics.
 */
export async function validate(uri: string, document: TextDocument, connection: Connection): Promise<void> {
  try {
    if (!uri.endsWith('.xd.component.html')) {
      return;
    }

    const componentPath = resolveComponentForTemplate(uri);
    if (!componentPath) {
      return;
    }

    const compilerOptions = loadCompilerOptions(dirname(uri));
    const compiled = await compileTemplate(uri, document.getText(), componentPath);
    const languageService = getLanguageService(compilerOptions);
    const tsDiagnostics = languageService.getSemanticDiagnostics(compiled.shimPath);
    connection.sendDiagnostics({
      uri,
      diagnostics: tsDiagnostics.map(toLspDiagnostic)
    });
  } catch (err) {
    connection.sendDiagnostics({
      uri,
      diagnostics: [{
        message: err instanceof Error ? err.message : String(err),
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        source: 'xaendar'
      }]
    });
  }
}

/**
 * Converts a TypeScript diagnostic into an LSP diagnostic.
 *
 * @param diagnostic - TypeScript diagnostic to convert.
 * @returns The equivalent language server protocol diagnostic.
 */
export function toLspDiagnostic(diagnostic: Diagnostic): LSPDiagnostic {
  const start = diagnostic.start ?? 0;
  const length = diagnostic.length ?? 0;

  let startPosition = Position.create(0, 0);
  let endPosition = Position.create(0, 0);

  if (diagnostic.file) {
    const tsStart = diagnostic.file.getLineAndCharacterOfPosition(start);
    const tsEnd = diagnostic.file.getLineAndCharacterOfPosition(start + length);
    startPosition = Position.create(tsStart.line, tsStart.character);
    endPosition = Position.create(tsEnd.line, tsEnd.character);
  }

  return {
    message: typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText,
    severity: mapSeverity(diagnostic.category),
    range: {
      start: startPosition,
      end: endPosition,
    },
    source: 'xaendar'
  };
}

/**
 * Maps a TypeScript diagnostic category to an LSP diagnostic severity.
 *
 * @param kind - TypeScript diagnostic category.
 * @returns The matching LSP diagnostic severity.
 */
function mapSeverity(kind: DiagnosticCategory): DiagnosticSeverity {
  switch (kind) {
    case DiagnosticCategory.Error: return DiagnosticSeverity.Error;
    case DiagnosticCategory.Warning: return DiagnosticSeverity.Warning;
    case DiagnosticCategory.Suggestion: return DiagnosticSeverity.Hint;
    default: return DiagnosticSeverity.Information;
  }
}

/**
 * Converts an LSP or file URI to the corresponding filesystem path.
 *
 * @param uri - URI to convert.
 * @returns The URI's filesystem path.
 */
export function fromUri(uri: string): string {
  return URI.parse(uri).fsPath;
}