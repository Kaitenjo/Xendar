import { compile } from '@xaendar/compiler';
import { createShim } from '@xaendar/language-core';
import { dirname } from 'node:path';
import { CompiledTemplate } from './types/compiled-template.type';

const compiledCache = new Map<string, CompiledTemplate>();

/**
 * Recompiles a template and regenerates the virtual TypeScript shim used by
 * the language service for completion, hover, and diagnostics. It should be
 * called for every debounced buffer change, not only on save, so completion
 * remains available while the user is typing.
 *
 * @param templateUri - URI of the template being compiled.
 * @param templateSource - Current source text of the template.
 * @param componentData - Absolute path to the components TypeScript file.
 * @returns The compiled template metadata stored in the cache.
 */
export async function compileTemplate(templateUri: string, templateSource: string, componentData: Map<string, string[]>): Promise<CompiledTemplate> {
  const typecheckBody = await compile(templateSource, { baseDir: dirname(templateUri) });
  const shim = createShim(componentData, typecheckBody);
  const compiled: CompiledTemplate = {
    typecheckBody, 
    shimPath: shim.path, 
    bodyLineOffset: shim.bodyLineOffset, 
    classNames: shim.classNames 
  };
  compiledCache.set(templateUri, compiled);
  return compiled;
}

/**
 * Gets the cached compilation result for a template.
 *
 * @param templateUri - URI of the template.
 * @returns The cached compiled template, or `undefined` when it has not been compiled.
 */
export function getCompiledTemplate(templateUri: string): CompiledTemplate | undefined {
  return compiledCache.get(templateUri);
}