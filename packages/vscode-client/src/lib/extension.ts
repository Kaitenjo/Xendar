import * as path from 'node:path';
import { ExtensionContext, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient | null = null;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { 
      module: serverModule, 
      transport: TransportKind.ipc 
    },
    debug: { 
      module: serverModule, 
      transport: TransportKind.ipc, 
      options: { 
        execArgv: ['--nolazy', '--inspect=6009'] 
      } 
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', pattern: '**/*.xd.component.html' }],
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.xd.component.ts'),
      ],
    },
  };

  client = new LanguageClient('xaendarLanguageServer', 'Xaendar Language Server', serverOptions, clientOptions);
  client.start();
}

export function deactivate(): Promise<void> | undefined {
  return client?.stop();
}