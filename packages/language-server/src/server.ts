import { createConnection, TextDocuments, ProposedFeatures, InitializeParams, TextDocumentSyncKind, CompletionParams, } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { recompileTemplate } from './document-manager';
import { getCompletions } from './completions';
import { getTemplateDiagnostics } from '@xaendar/language-core';
import { findComponentForTemplate } from '@xaendar/language-core';
import { loadCompilerOptions } from './tsconfig-loader';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams) => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ['.', '{', '('] },
    hoverProvider: true,
  },
}));

documents.onDidChangeContent(debounce(async change => {
  const uri = change.document.uri;
  if (!uri.endsWith('.xd.component.html')) return;

  const componentPath = findComponentForTemplate(fromUri(uri));
  if (!componentPath) return;

  const compilerOptions = loadCompilerOptions(componentPath);
  await recompileTemplate(uri, change.document.getText(), componentPath);

  const diagnostics = await getTemplateDiagnostics(
    componentPath, fromUri(uri), change.document.getText(), compilerOptions
  );
  connection.sendDiagnostics({
    uri,
    diagnostics: diagnostics.map(toLspDiagnostic),
  });
}, 200));

connection.onCompletion((params: CompletionParams) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const componentPath = findComponentForTemplate(fromUri(params.textDocument.uri));
  if (!componentPath) return [];

  return getCompletions(
    params.textDocument.uri,
    doc.getText(),
    params.position,
    loadCompilerOptions(componentPath)
  );
});

documents.listen(connection);
connection.listen();