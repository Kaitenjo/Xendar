/**
 * @fileoverview CompilerHost interface — the contract between the compiler and the environment it runs in.
 *
 * The compiler never accesses the filesystem, network, or any external resource directly.
 * All I/O is delegated to the CompilerHost, allowing the same compiler core to run in
 * different environments by swapping the host implementation:
 *
 * - **Node.js** (`build-tools`, `cli`) — reads and writes real files on disk
 * - **Editor** (`language-tools`) — reads live document content from the editor buffer,
 *   which may differ from the file on disk when unsaved changes are present
 * - **Tests** — uses in-memory virtual files without touching the real filesystem
 *
 * @example
 * // Minimal Node.js implementation
 * import * as fs from 'node:fs';
 * import * as path from 'node:path';
 *
 * class NodeCompilerHost implements CompilerHost {
 *   readFile(filePath: string) {
 *     try { return fs.readFileSync(filePath, 'utf8'); }
 *     catch { return undefined; }
 *   }
 *   fileExists(filePath: string) { return fs.existsSync(filePath); }
 *   resolvePath(from: string, to: string) { return path.resolve(path.dirname(from), to); }
 *   getDirectoryEntries(dirPath: string) { return fs.readdirSync(dirPath); }
 *   isDirectory(filePath: string) { return fs.statSync(filePath).isDirectory(); }
 *   getRealPath(filePath: string) { return fs.realpathSync(filePath); }
 *   getCurrentDirectory() { return process.cwd(); }
 * }
 */
/**
 * The contract between the compiler and the filesystem environment it runs in.
 *
 * The compiler uses this host for all I/O operations. It never accesses the filesystem,
 * the network, or any other external resource directly. This makes it possible to use
 * the same compiler in different environments:
 *
 * - **Node.js** (`build-tools`, `cli`) — reads and writes real files on disk
 * - **Editor** (`language-tools`) — reads live document content from open editor buffers,
 *   which may differ from the file on disk when unsaved changes are present
 * - **Tests** — uses in-memory virtual files without touching the real filesystem
 *
 * Implementations should be **synchronous** wherever possible to ensure compatibility
 * with the TypeScript compiler host API, which does not support async operations
 * in its core methods.
 *
 * @example
 * // Typical usage — the compiler receives the host as a dependency
 * const host: CompilerHost = new NodeCompilerHost();
 * const compiler = new Compiler(host);
 * const result = compiler.compile('/src/app.component.html');
 */
export interface CompilerHost {
  /**
   * Checks whether a file exists and can be read.
   *
   * Used by the compiler to:
   * - Verify that a template associated with a component exists before attempting
   *   to read it (e.g. `app.component.html` paired with `app.component.ts`)
   * - Resolve optional imports
   * - Decide which resolution strategy to apply
   *
   * In environments with a virtual file system (such as `language-tools`),
   * this method must return `true` for virtual files that do not exist on disk,
   * such as Template Check Blocks (TCBs) generated in memory.
   *
   * @param filePath - Absolute path of the file whose existence to check.
   * @returns `true` if the file exists and is accessible, `false` otherwise.
   *
   * @example
   * const templatePath = host.resolvePath(componentPath, './app.component.html');
   * if (host.fileExists(templatePath)) {
   *   const template = host.readFile(templatePath);
   * }
   */
  fileExists(filePath: string): boolean;
  /**
   * Returns the current working directory of the process.
   *
   * Used by the compiler as the base for resolving relative paths that have
   * no associated source file — for example, paths specified in the project
   * configuration or passed as CLI arguments.
   *
   * In an editor environment, this should return the root of the open workspace,
   * not the directory of the editor process itself.
   *
   * @returns The absolute path of the current working directory.
   *
   * @example
   * // Resolves a relative path from the project configuration
   * const configRelativePath = './src';
   * const absolutePath = host.resolvePath(
   *   host.getCurrentDirectory() + '/placeholder',
   *   configRelativePath
   * );
   */
  getCurrentDirectory(): string;
  /**
   * Returns the list of files and subdirectories inside a directory.
   *
   * Used by the compiler during the discovery phase — when it needs to find
   * all components in the project without them being explicitly listed, or
   * when it needs to resolve glob patterns in the project configuration.
   *
   * Returns only entry names, not absolute paths. The caller is responsible
   * for combining the results with `dirPath` via `resolvePath` to obtain
   * absolute paths.
   *
   * @param dirPath - Absolute path of the directory to read.
   * @returns An array of file and directory names inside `dirPath`.
   *   Returns an empty array if the directory is empty or does not exist.
   *
   * @example
   * const entries = host.getDirectoryEntries('/src/components');
   * // → ['button', 'input', 'modal']
   *
   * const componentFiles = entries
   *   .map(entry => host.resolvePath('/src/components', entry))
   *   .filter(p => host.fileExists(p) && p.endsWith('.ts'));
   */
  getDirectoryEntries(dirPath: string): string[];
  /**
   * Resolves symlinks and returns the real physical path of a file.
   *
   * Used by the compiler to normalise paths before using them as keys in
   * internal caches. Two different paths pointing to the same physical file
   * (one through a symlink) must produce the same compiled output and must
   * not generate duplicates in the module graph.
   *
   * Particularly important in monorepos using workspace links (npm/yarn/pnpm),
   * where local packages are often symlinked inside `node_modules`.
   *
   * @param filePath - Absolute path, potentially containing symlinks.
   * @returns The real absolute path with all symlinks resolved.
   *   If the path does not exist or cannot be resolved, returns `filePath` unchanged.
   *
   * @example
   * // In a pnpm monorepo:
   * // /app/node_modules/@my-lib/core → /packages/core/src
   * host.getRealPath('/app/node_modules/@my-lib/core/index.ts');
   * // → '/packages/core/src/index.ts'
   */
  getRealPath(filePath: string): string;
  /**
   * Checks whether the given path refers to a directory.
   *
   * Used together with `getDirectoryEntries` to distinguish files from
   * subdirectories when recursing through the filesystem. Also needed to
   * validate output paths before writing files.
   *
   * @param filePath - Absolute path to check.
   * @returns `true` if the path exists and is a directory, `false` in all
   *   other cases (regular file, symlink to a file, non-existent path).
   *
   * @example
   * const entries = host.getDirectoryEntries('/src');
   * for (const entry of entries) {
   *   const fullPath = host.resolvePath('/src', entry);
   *   if (host.isDirectory(fullPath)) {
   *     // recurse into subdirectory
   *   }
   * }
   */
  isDirectory(filePath: string): boolean;
  /**
   * Reads the content of a file as a UTF-8 string.
   *
   * The compiler calls this method to read:
   * - Template files (`.html` files containing the custom DSL)
   * - TypeScript source files (`.ts`) when needed for analysis
   * - Project configuration files
   *
   * Returns `undefined` instead of throwing when the file does not exist or
   * cannot be read. The compiler handles the `undefined` case by emitting
   * an appropriate diagnostic.
   *
   * In an editor environment, this method must return the content currently
   * held in the **editor buffer**, not the content on disk. This ensures the
   * compiler always operates on the most up-to-date code, even when unsaved
   * changes are present.
   *
   * @param filePath - Absolute path of the file to read.
   * @returns The file content as a string, or `undefined` if the file does
   *   not exist or cannot be read.
   *
   * @example
   * const content = host.readFile('/src/app.component.html');
   * if (content === undefined) {
   *   // file not found — the compiler will emit a diagnostic
   * }
   */
  readFile(filePath: string): string | undefined;
  /**
   * Resolves a path relative to the source file that contains the reference.
   *
   * The compiler calls this method whenever it needs to turn a relative path
   * (such as `./app.component.html` inside a `@Component` decorator) into an
   * absolute path suitable for passing to `readFile` and `fileExists`.
   *
   * The default implementation should behave like
   * `path.resolve(path.dirname(from), to)` in Node.js, but can be overridden
   * to handle path aliases, `tsconfig.json` path mappings, or custom project
   * conventions.
   *
   * @param from - Absolute path of the source file that contains the reference.
   *   Typically the `.ts` file of the component.
   * @param to - Relative or absolute path to resolve. May be relative
   *   (`./template.html`), aliased (`@components/button.html`), or already absolute.
   * @returns The resolved absolute path of the target file.
   *
   * @example
   * // from: '/src/features/user/user.component.ts'
   * // to:   './user.component.html'
   * // →     '/src/features/user/user.component.html'
   * const templatePath = host.resolvePath(
   *   '/src/features/user/user.component.ts',
   *   './user.component.html'
   * );
   */
  resolvePath(from: string, to: string): string;
}