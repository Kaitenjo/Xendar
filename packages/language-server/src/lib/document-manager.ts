import { compile } from '@xaendar/compiler';
import { createShim, extractClassName } from '@xaendar/language-core';
import { dirname } from 'node:path';
import { CompiledTemplate } from './types/compiled-template.type';

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

  const { typescript: typecheckBody } = await compile(templateSource, dirname(templateUri), varName);

  const shim = createShim(className, templateUri, typecheckBody);
  const compiled: CompiledTemplate = { typecheckBody, shimPath: shim.path, bodyLineOffset: shim.bodyLineOffset, className };
  compiledCache.set(templateUri, compiled);
  return compiled;
}

export function getCompiledTemplate(templateUri: string): CompiledTemplate | undefined {
  return compiledCache.get(templateUri);
}