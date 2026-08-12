import { statSync, writeFileSync } from 'node:fs';
import { CompilerOptions, createDocumentRegistry, createLanguageService, getDefaultLibFilePath, LanguageService, LanguageServiceHost, ScriptSnapshot, sys } from 'typescript';

/**
 * typecheck-service.ts
 *
 * Module-level singleton (persists for the lifetime of the Node process /
 * as long as the ESM module registry keeps this module alive) that manages:
 * - a map of "virtual files" (the TS shims generated from the DSL AST),
 *   each versioned so the LanguageService can tell when to re-check them
 * - a persistent ts.LanguageService that sees both the real files on disk
 *   and the virtual shim files
 * - dispose/reinitialization when compilerOptions change mid-session
 * - cleanup helpers for virtual files whose source DSL file has disappeared
 *
 * Meant to be imported from the Vite plugin's `transform` hook (and from
 * anywhere else in the pipeline that needs to query diagnostics).
 */

type VirtualFileEntry = {
  content: string;
  version: number;
}

/** 
 * Generated TS shims, keyed by the absolute path of the virtual file. 
 * */
const virtualFiles = new Map<string, VirtualFileEntry>();

/** 
 * Synthetic versions for real files, used to invalidate the LanguageService's
 * internal snapshot cache when a source file changes on disk (mtime-based). 
 */
const realFileVersions = new Map<string, string>();

/** 
 * Real project files known to the Program, populated by the plugin as Vite
 * processes each component (see registerRealFile). 
 */
const realFiles = new Set<string>();

/** 
 * The shared LanguageService instance, lazily created on first use by
 * getLanguageService() and torn down by disposeLanguageService(). 
 * */
let languageService: LanguageService | undefined;

/** 
 * The compilerOptions the current languageService was created with, kept
 * around so getLanguageService() can detect when they change and force a
 * recreate (see the "vite.config / tsconfig changes mid-session" case). 
 */
let currentCompilerOptions: CompilerOptions | undefined;

/**
 * Returns the shared LanguageService, creating it (or recreating it) as
 * needed. If the given compilerOptions differ from the ones the current
 * LanguageService was created with, the old instance is disposed and a
 * fresh one is created — this covers the case where vite.config / tsconfig
 * changes while the dev server is running.
 */
export function getLanguageService(compilerOptions: CompilerOptions): LanguageService {
  const optionsChanged = currentCompilerOptions && JSON.stringify(currentCompilerOptions) !== JSON.stringify(compilerOptions);

  if (languageService && optionsChanged) {
    disposeLanguageService();
  }

  currentCompilerOptions = compilerOptions;
  languageService ??= createLanguageService(createHost(() => [...realFiles]), createDocumentRegistry());
  return languageService;
}

/**
 * Builds a LanguageServiceHost backed by:
 * - the virtualFiles map, for generated shims
 * - the real filesystem (via ts.sys), for actual project source files
 *
 * @param getRootFileNames - lazy getter for the current set of real root
 *   file names; passed as a function (rather than a snapshot array) so the
 *   host always reflects the latest state of `realFiles` without needing
 *   to rebuild the host itself.
 */
function createHost(getRootFileNames: () => string[]): LanguageServiceHost {
  return {
    getScriptFileNames: () => [
      ...getRootFileNames(),
      ...virtualFiles.keys(),
    ],
    getScriptVersion(fileName) {
      const virtual = virtualFiles.get(fileName);
      return virtual ? String(virtual.version) : getRealFileVersion(fileName);
    },
    getScriptSnapshot(fileName) {
      const virtual = virtualFiles.get(fileName);
      if (virtual) {
        return ScriptSnapshot.fromString(virtual.content);
      }

      if (!sys.fileExists(fileName)) {
        return undefined;
      }

      const text = sys.readFile(fileName);
      if (text === undefined) {
        return undefined;
      }

      return ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => currentCompilerOptions ?? {},
    getDefaultLibFileName: opts => getDefaultLibFilePath(opts),
    fileExists(fileName) {
      return virtualFiles.has(fileName) || sys.fileExists(fileName);
    },
    readFile(fileName) {
      const virtual = virtualFiles.get(fileName);
      if (virtual) return virtual.content;
      return sys.readFile(fileName);
    },
    readDirectory: sys.readDirectory,
    directoryExists: sys.directoryExists,
    getDirectories: sys.getDirectories,
    realpath: sys.realpath,
  };
}

/**
 * Disposes the current LanguageService and clears all associated state
 * (virtual files, real file version cache, known root files). Call this
 * from `configureServer` -> `httpServer.on('close', ...)`, or from
 * `closeBundle`, to avoid leaking a stale instance across server restarts.
 */
export function disposeLanguageService(): void {
  languageService!.dispose();
  languageService = undefined;
  currentCompilerOptions = undefined;
  virtualFiles.clear();
  realFileVersions.clear();
  realFiles.clear();
}

/**
 * Registers a real project file as a root file for the Program, so the
 * LanguageService's module resolver can find it when a virtual shim
 * imports the corresponding component class.
 */
export function registerRealFile(fileName: string): void {
  realFiles.add(fileName);
}

/**
 * Removes a real project file, e.g. when its source DSL file is deleted from
 * the project or no longer matches the plugin.
 */
export function removeRealFile(filename: string): void {
  realFiles.delete(filename);
}

/**
 * Synthetic version string for a real file, based on its mtime, so the
 * LanguageService can detect when a source file has changed on disk.
 * Falls back to the last known version (or '0') if the file can no longer
 * be stat'd, to avoid spurious invalidation churn.
 */
function getRealFileVersion(fileName: string): string {
  try {
    const stat = statSync(fileName);
    const v = String(stat.mtimeMs);
    realFileVersions.set(fileName, v);
    return v;
  } catch {
    return realFileVersions.get(fileName) ?? '0';
  }
}

/**
 * Updates (or creates) the virtual shim for the given path, bumping its
 * version only if the content actually changed — this avoids invalidating
 * the LanguageService's internal cache for no-op writes.
 */
export function upsertVirtualFile(virtualPath: string, content: string): void {
  const existing = virtualFiles.get(virtualPath);
  if (existing?.content !== content) {
    virtualFiles.set(virtualPath, {
      content,
      version: (existing?.version ?? 0) + 1,
    });
  }
}

/**
 * Removes a virtual shim, e.g. when its source DSL file is deleted from
 * the project or no longer matches the plugin.
 */
export function removeVirtualFile(virtualPath: string): void {
  virtualFiles.delete(virtualPath);
}