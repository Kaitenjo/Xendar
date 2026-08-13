import { getLanguageService, loadCompilerOptions } from '@xaendar/language-core';
import { dirname } from 'node:path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionParams, createConnection, DiagnosticSeverity, FileChangeType, ProposedFeatures, TextDocuments, TextDocumentSyncKind } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { getCompletions } from './completions';
import { getCompiledTemplate, recompileTemplate } from './document-manager';
import { toLspDiagnostic } from './lps-diagnostics';
import { buildComponentIndex, indexComponent, removeComponentFromIndex, resolveComponentForTemplate } from './template-registry';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(async () => {
  const folders = await connection.workspace.getWorkspaceFolders();
  if (folders?.length) {
    const roots = folders.map(folder => fromUri(folder.uri));
    await buildComponentIndex(roots);
  }

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ['.', '{', '('] },
      hoverProvider: true,
    }
  }
});

connection.onDidChangeWatchedFiles(event => {
  for (let i = 0; i < event.changes.length; i++) {
    const change = event.changes[i];
    const path = fromUri(change.uri);
    if (path.endsWith('.xd.component.ts')) {
      change.type === FileChangeType.Deleted
        ? removeComponentFromIndex(path)
        : indexComponent(path);
    }
  }
});

connection.onCompletion(async (params: CompletionParams) => {
  const templatePath = params.textDocument.uri;
  const doc = documents.get(templatePath);
  if (!doc) {
    return [];
  }

  const componentPath = resolveComponentForTemplate(templatePath);
  if (!componentPath) {
    return [];
  }


  if (!getCompiledTemplate(templatePath)) {
    await recompileTemplate(templatePath, doc.getText(), componentPath);
  }

  const compilerOptions = loadCompilerOptions(dirname(templatePath));
  return getCompletions(params.textDocument.uri, doc, params.position, compilerOptions);
});

documents.onDidChangeContent(change => debouncePerKey(() => validate(change.document.uri, change.document), 200));
documents.listen(connection);
connection.listen();

async function validate(uri: string, document: TextDocument): Promise<void> {
  if (!uri.endsWith('.xd.component.html')) {
    return;
  }

  try {
    const componentPath = resolveComponentForTemplate(uri);
    if (!componentPath) {
      return;
    }

    const compilerOptions = loadCompilerOptions(dirname(uri));
    const compiled = await recompileTemplate(uri, document.getText(), componentPath);
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
        source: 'xaendar',
      }],
    });
  }
}

/*
  TODO: Understand if neeeded
*/
export function fromUri(uri: string): string {
  return URI.parse(uri).fsPath;
}

function debouncePerKey<Args extends unknown[]>(fn: (key: string, ...args: Args) => void, ms: number): (key: string, ...args: Args) => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return (key: string, ...args: Args) => {
    const existing = timers.get(key);
    if (existing) {
      clearTimeout(existing)
    };

    timers.set(key, setTimeout(() => {
      timers.delete(key);
      fn(key, ...args);
    }, ms));
  };
}