import { compile, TypeCheckResult } from '@xaendar/compiler';
import { upsertVirtualFile } from '@xaendar/language-core';
import { readFileSync } from 'node:fs';
import { basename, dirname, extname } from 'node:path';

export interface CompiledTemplate {
  typecheckBody: TypeCheckResult;
  shimPath: string;
  bodyLineOffset: number;
  className: string;
}

const compiledCache = new Map<string, CompiledTemplate>();

/**
 * Ricompila il template e rigenera lo shim TS virtuale usato dal
 * LanguageService per completions/hover/diagnostics. Va richiamato ad
 * ogni cambio del buffer (debounced), non solo al salvataggio: le
 * completion devono funzionare mentre l'utente digita, non solo dopo save.
 */
export async function recompileTemplate(templateUri: string, templateSource: string, componentPath: string): Promise<CompiledTemplate> {
  const className = extractClassName(componentPath);
  const varName = `__${className}_sheet`;

  const { typescript: typecheckBody } = await compile(templateSource, dirname(componentPath), varName);

  const shimPath = `${componentPath}.__typecheck__.ts`;
  const importSpecifier = `./${basename(componentPath, extname(componentPath))}`;
  const prefixLines = [
    `import { ${className} } from '${importSpecifier}';`,
    '',
    `declare const root: ${className};`,
    '',
  ];
  const bodyLineOffset = prefixLines.length;

  upsertVirtualFile(shimPath, [...prefixLines, typecheckBody.text].join('\n'));

  const compiled: CompiledTemplate = { typecheckBody, shimPath, bodyLineOffset, className };
  compiledCache.set(templateUri, compiled);
  return compiled;
}

export function getCompiledTemplate(templateUri: string): CompiledTemplate | undefined {
  return compiledCache.get(templateUri);
}

function extractClassName(componentPath: string): string {
  return readFileSync(componentPath, 'utf-8').match(/class\s+(\w+)\s+extends/)?.[1] ?? '__Component';
}