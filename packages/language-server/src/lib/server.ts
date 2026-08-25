import { TextDocument } from 'vscode-languageserver-textdocument';
import { createConnection, ProposedFeatures, TextDocuments } from 'vscode-languageserver/node';
import { debounce, fromUri, onCompletion, onDidChangeWatchedFiles, onInitialize, onInitialized, validate } from './server-handlers';

let workspaceRoots = new Array<string>();

setTimeout(() => {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);
  
  connection.onInitialize(params => onInitialize(params, roots => workspaceRoots = roots));
  connection.onInitialized(() => onInitialized(workspaceRoots));
  connection.onDidChangeWatchedFiles(onDidChangeWatchedFiles);
  connection.onCompletion(params => onCompletion(params, documents));
  documents.onDidChangeContent(change => debounce(() => validate(fromUri(change.document.uri), change.document, connection), 300));
  documents.listen(connection);
  connection.listen();
}, 5000)
