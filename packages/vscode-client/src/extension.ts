import * as path from 'node:path';
import { ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6009'] } },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', pattern: '**/*.xd.component.html' }],
    synchronize: {
      fileEvents: [
        // il server deve sapere anche quando cambiano i .ts, per invalidare
        // gli shim — passiamo l'evento via watcher, il client lo inoltra
      ],
    },
  };

  client = new LanguageClient('xaendarLanguageServer', 'Xaendar Language Server', serverOptions, clientOptions);
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}