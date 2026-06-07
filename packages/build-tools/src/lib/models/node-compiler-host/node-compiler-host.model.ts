import type { CompilerHost } from '@xaendar/compiler';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Node.js implementation of {@link CompilerHost}.
 *
 * Reads files synchronously from the real filesystem using the Node.js
 * `fs` and `path` modules. Intended for use in `build-tools` (Vite and
 * esbuild plugins) and `cli` (project and component generation).
 *
 * All methods are synchronous to match the expectations of the TypeScript
 * compiler host API and to keep the compiler pipeline free of async
 * complexity at the I/O level.
 *
 * Every method that interacts with the filesystem swallows OS-level errors
 * (e.g. `ENOENT`, `EACCES`) and returns a safe fallback value instead of
 * throwing. The compiler is responsible for turning missing or unreadable
 * files into structured diagnostics.
 *
 * @example
 * import { NodeCompilerHost } from '@xaendar/build-tools';
 * import { Compiler } from '@xaendar/compiler';
 *
 * const host = new NodeCompilerHost();
 * const compiler = new Compiler(host);
 * const result = compiler.compile('/absolute/path/to/template.xd.component.html');
 */
export class NodeCompilerHost implements CompilerHost {
  /**
   * Reads the content of a file from disk as a UTF-8 string.
   *
   * Returns `undefined` instead of throwing when the file does not exist,
   * is a directory, or cannot be read due to permission restrictions.
   * The compiler treats `undefined` as a missing-file condition and emits
   * an appropriate diagnostic.
   *
   * @param filePath - Absolute path of the file to read.
   * @returns The file content as a UTF-8 string, or `undefined` on any
   *   filesystem error.
   */
  public readFile(filePath: string): string | undefined {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch {
      return undefined;
    }
  }

  /**
   * Checks whether a file exists and is accessible on disk.
   *
   * Uses `existsSync` rather than `accessSync` to avoid throwing —
   * a missing file is an expected condition during path resolution,
   * not an exceptional one.
   *
   * Returns `true` for both regular files and directories. Callers that
   * need to distinguish between the two should combine this method with
   * {@link isDirectory}.
   *
   * @param filePath - Absolute path of the file to check.
   * @returns `true` if the path exists and is accessible, `false` otherwise.
   */
  public fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * Resolves a path relative to the **directory** containing the source file.
   *
   * Delegates to `path.resolve(path.dirname(from), to)` so that relative
   * paths like `./button.xd.component.html` are resolved against the
   * directory of the referencing file, not the current working directory.
   *
   * Absolute paths passed as `to` are returned unchanged by `path.resolve`
   * and therefore work correctly without any special handling.
   *
   * Does not resolve path aliases (e.g. `@components/button.html`).
   * Alias resolution must be performed by the caller before invoking
   * this method, or by providing a subclass that overrides it.
   *
   * @param from - Absolute path of the source file that contains the
   *   reference (e.g. the `.ts` file of the component).
   * @param to - Relative or absolute path to resolve.
   * @returns The resolved absolute path of the target file.
   *
   * @example
   * host.resolvePath(
   *   '/src/features/user/user.xd.component.ts',
   *   './user.xd.component.html',
   * );
   * // → '/src/features/user/user.xd.component.html'
   */
  public resolvePath(from: string, to: string): string {
    return resolve(dirname(from), to);
  }

  /**
   * Returns the names of all entries (files and subdirectories) inside
   * a directory.
   *
   * Returns an empty array instead of throwing when the directory does
   * not exist, is not readable, or `dirPath` points to a regular file.
   * This matches the behaviour expected by the compiler during the
   * discovery phase, where missing directories are not errors.
   *
   * The returned names are entry names only — not absolute paths. Callers
   * must combine them with `dirPath` via {@link resolvePath} to obtain
   * usable absolute paths.
   *
   * @param dirPath - Absolute path of the directory to read.
   * @returns An array of entry names inside `dirPath`, or an empty array
   *   if the directory does not exist or cannot be read.
   *
   * @example
   * host.getDirectoryEntries('/src/components');
   * // → ['button', 'input', 'modal']
   */
  public getDirectoryEntries(dirPath: string): string[] {
    try {
      return readdirSync(dirPath);
    } catch {
      return [];
    }
  }

  /**
   * Checks whether the given path refers to a directory.
   *
   * Uses `statSync` rather than `lstatSync` so that symlinks to directories
   * are correctly reported as directories. Returns `false` for non-existent
   * paths, regular files, symlinks to files, and any path that causes
   * `statSync` to throw (e.g. permission denied).
   *
   * @param filePath - Absolute path to check.
   * @returns `true` if the path exists and is a directory (or a symlink
   *   to one), `false` in all other cases.
   */
  public isDirectory(filePath: string): boolean {
    try {
      return statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Resolves all symlinks in a path and returns the real physical path.
   *
   * Critical in npm monorepos where workspace packages are symlinked inside
   * `node_modules`. Without real-path resolution the compiler may process
   * the same physical file twice under different apparent paths, producing
   * duplicate entries in the module graph and the output bundle.
   *
   * Falls back to returning `filePath` unchanged when `realpathSync` throws
   * (e.g. the path does not exist or a symlink is dangling). This keeps the
   * compiler operational even when the path cannot be fully resolved.
   *
   * @param filePath - Absolute path, potentially containing symlinks.
   * @returns The real absolute path with all symlinks resolved, or
   *   `filePath` unchanged if resolution fails.
   *
   * @example
   * // In an npm monorepo:
   * // /app/node_modules/@xaendar/core → /packages/core/src
   * host.getRealPath('/app/node_modules/@xaendar/core/index.ts');
   * // → '/packages/core/src/index.ts'
   */
  public getRealPath(filePath: string): string {
    try {
      return realpathSync(filePath);
    } catch {
      return filePath;
    }
  }

  /**
   * Returns the current working directory of the Node.js process.
   *
   * Used by the compiler as the base for resolving relative paths that
   * have no associated source file — for example paths passed as CLI
   * arguments or specified in the project configuration file.
   *
   * @returns The absolute path of the current working directory.
   */
  public getCurrentDirectory(): string {
    return process.cwd();
  }
}