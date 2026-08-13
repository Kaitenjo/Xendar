import { Diagnostic, DiagnosticCategory } from 'typescript';
import { DiagnosticSeverity, Diagnostic as LSPDiagnostic, Position } from 'vscode-languageserver/node';

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

function mapSeverity(kind: DiagnosticCategory): DiagnosticSeverity {
  switch (kind) {
    case DiagnosticCategory.Error: return DiagnosticSeverity.Error;
    case DiagnosticCategory.Warning: return DiagnosticSeverity.Warning;
    case DiagnosticCategory.Suggestion: return DiagnosticSeverity.Hint;
    default: return DiagnosticSeverity.Information;
  }
}