import { isValidCustomElementName } from '@xaendar/common';
import { compile } from '@xaendar/compiler';
import { basename, dirname, extname, resolve } from 'node:path';
import { CompilerOptions, Diagnostic, findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from 'typescript';
import type { Logger, Plugin } from 'vite';
import { COMPONENT_FILE_RE } from '../../costants/component-filename-regex';
import { disposeLanguageService, getLanguageService, registerRealFile, removeRealFile, removeVirtualFile, upsertVirtualFile } from '../language-service';
import { NodeCompilerHost } from '../node-compiler-host/node-compiler-host.model';
import { clearTemplateRegistry, findComponentForTemplate, registerTemplateMapping, removeTemplateMapping } from '../template-registry';

/**
 * Vite plugin that compiles Xaendar DSL template files (`.xd.component.html`)
 * and injects the generated render methods into the associated component class.
 *
 * ## Dev mode
 *
 * Files are transformed on demand when the browser requests them. The plugin
 * registers the template as a watch file via `this.addWatchFile` so that
 * modifying the template invalidates the component module and triggers HMR.
 *
 * ## Production build
 *
 * The same `transform` hook runs for every component file during the esbuild
 * bundling phase. The output is handed to esbuild as TypeScript, which strips
 * the types and produces the final JavaScript bundle.
 *
 * @returns A Vite {@link Plugin} instance.
 *
 * @example
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { xaendarPlugin } from '@xaendar/build-tools';
 *
 * export default defineConfig({
 *   plugins: [xaendarPlugin()],
 * });
 */
export function xaendarPlugin(): Plugin {
  const host = new NodeCompilerHost;
  let compilerOptions: CompilerOptions | undefined;
  let logger: Logger | undefined;

  const reportNonFatalError = (message: string): void => {
    const redMessage = `\x1b[31m${message}\x1b[0m`;
    (logger ?? console).error(redMessage)
  };

  return {
    name: 'xaendar',
    async transform(code, id) {
      if (!COMPONENT_FILE_RE.test(id)) {
        return null;
      }

      try {
        assertValidCustomElementName(code, id);
      } catch (err) {
        reportNonFatalError(String(err));
        return null;
      }

      const className = extractClassName(code)
      const { templatePath, stylePath } = extractDecoratorPaths(code, dirname(id));
      if (!templatePath || !host.fileExists(templatePath)) {
        this.warn(`Xaendar: could not find template at ${templatePath}`);
        return null;
      }

      this.addWatchFile(templatePath);
      registerTemplateMapping(templatePath, id);
      const templateSource = host.readFile(templatePath);
      if (templateSource === undefined) {
        this.warn(`Xaendar: could not read template at ${templatePath}`);
        return null;
      }

      let cssContent: string | undefined;

      if (stylePath && host.fileExists(stylePath)) {
        this.addWatchFile(stylePath);
        cssContent = host.readFile(stylePath);
      }

      let compiledMethods: string | undefined;
      let typecheckBody: string | undefined;
      const varName = cssContent ? `__${className}_sheet` : undefined;

      try {
        const result = await compile(templateSource, dirname(id), varName);
        compiledMethods = result.javascript;
        typecheckBody = result.typescript;
      } catch (err) {
        reportNonFatalError(`Xaendar: failed to compile template ${templatePath}: ${String(err)}`);
        return null;
      }

      let transformed: string | undefined;
      
      try {
        transformed = fixDecoratorExport(injectRenderMethods(code, compiledMethods, varName, cssContent));
      } catch (err) {
        reportNonFatalError(String(err));
        return null;
      }

      compilerOptions ??= loadCompilerOptions(dirname(id));
      registerRealFile(id);

      const shimPath = `${id}.__typecheck__.ts`;
      upsertVirtualFile(shimPath, buildTypecheckShim(className, id, typecheckBody));

      const languageService = getLanguageService(compilerOptions);
      const diagnostics = languageService.getSemanticDiagnostics(shimPath);

      for (const diagnostic of diagnostics) {
        reportNonFatalError(describeDiagnostic(diagnostic));
      }

      return {
        code: transformed
      };
    },
    watchChange(id, change) {
      if (change.event === 'delete') {
        if (COMPONENT_FILE_RE.test(id)) {
          removeVirtualFile(`${id}.__typecheck__.ts`);
          removeRealFile(id);
        } else if (id.endsWith('.html')) {
          const componentId = findComponentForTemplate(id);
          if (componentId) {
            removeVirtualFile(`${componentId}.__typecheck__.ts`);
            removeTemplateMapping(id);
          }
        }
      }
    },
    configureServer(server) {
      logger = server.config?.logger;

      server.httpServer?.on('close', () => {
        clearTemplateRegistry();
        disposeLanguageService();
        logger = undefined;
      });
    },
  };
}

/**
 * Asserts that every selector declared in the `@WebComponent` decorator of
 * the given source file is a valid custom-element name according to the HTML
 * spec (must contain a hyphen and satisfy other naming constraints).
 *
 * @param code - The raw TypeScript source of the component file.
 * @param id - The resolved file path, used only for error messages.
 * @throws {Error} When no selector is found, or when any selector is not a
 *   valid custom-element name.
 */
function assertValidCustomElementName(code: string, id: string): void {
  const selectorRegex = /selector:\s*('[^']*'|"[^"]*"|\[[^\]]*\])/;
  const match = code.match(selectorRegex);

  if (!match) {
    throw new Error(`Xaendar: no selector found in component ${id}\nMake sure the class has a @WebComponent decorator with a valid selector property`);
  }

  const raw = match[1]!;
  const selectors = raw.startsWith('[')
    ? [...raw.matchAll(/'([^']*)'|"([^"]*)"/g)].map(match => (match[1] ?? match[2])!)
    : [raw.slice(1, -1)];

  for (const selector of selectors) {
    if (!isValidCustomElementName(selector)) {
      throw new Error(`Xaendar: invalid custom element name "${selector}" in component ${id}`);
    }
  }
}

/**
 * Extracts the `templateUrl` and `styleUrl` values from the `@WebComponent`
 * decorator in the component source and resolves them to absolute paths.
 *
 * @param jsSource - The raw TypeScript source of the component file.
 * @param componentDir - The directory containing the component file, used as
 *   base for resolving relative decorator paths.
 * @returns An object with the resolved `templatePath` and `stylePath`.
 *   Either field may be `undefined` when the corresponding decorator
 *   property is absent.
 */
function extractDecoratorPaths(jsSource: string, componentDir: string): { templatePath?: string, stylePath?: string } {
  const templateUrl = jsSource.match(/templateUrl\s*:\s*["'](.+?)["']/)?.[1];
  const styleUrl = jsSource.match(/styleUrl\s*:\s*["'](.+?)["']/)?.[1];

  return {
    templatePath: templateUrl ? resolve(componentDir, templateUrl) : undefined,
    stylePath: styleUrl ? resolve(componentDir, styleUrl) : undefined
  };
}

/**
 * Injects the compiled render methods into the original component component code
 * by replacing the placeholder static block scaffolded by the CLI. The block
 * is guaranteed to be present added by the Babel plugin, so if it's not found
 * the function throws an error indicating a misconfiguration in the component
 * file. 
 * 
 * The compiled methods are inserted before the static block, which is
 * preserved to maintain the correct execution order: the methods must be
 * defined before the initializer function runs, as the latter may reference them
 * to register the component with the framework.
 *
 * @param compiledCode - The original TypeScript source of the component file.
 * @param compiledMethods - The raw output of the compiler, already
 *   formatted as class method bodies (no `function` keyword, no standalone
 *   context parameter).
 * @param varName - The variable name to use for the shared `CSSStyleSheet`
 *   declaration, if any CSS content is provided.
 * @param cssContent - The raw CSS content read from disk, to be injected as a
 *   shared `CSSStyleSheet` if not empty.
 * @returns The transformed TypeScript source with the placeholder replaced
 *   by the compiled methods.
 * @throws {Error} When the placeholder is not found in the source — this
 *   means the component file was not scaffolded correctly by the CLI.
 */
function injectRenderMethods(jsSource: string, compiledMethods: string, varName?: string, cssContent?: string): string {
  const styleSnippet = cssContent?.trim().length ? buildStyleSnippet(varName!, cssContent) : '';

  let result = jsSource;

  if (styleSnippet) {
    result = result.replace(/^(class\s+\w+\s+extends)/m, `${styleSnippet}$1`);
  }

  const lastStaticBlock = /static\s*\{\s*\n(\s*)(\w+)\(\);\s*\n\s*\}/;

  if (!lastStaticBlock.test(result)) {
    throw new Error('Xaendar: could not find the static initializer block in the transpiled output. Make sure @rolldown/plugin-babel with @babel/plugin-proposal-decorators runs before xaendarPlugin() in your Vite config.');
  }

  const requiredImports = ['effect', '_if', '_switch', '_for', 'Context', '_iterationVariables', '_renderElement', '_renderText', '_renderLiteralText', 'createElement', 'createSVGElement', 'createMATHMLElement'];

  const alreadyImported = new Set<string>();
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(result)) !== null) {
    match[1]
      ?.split(',')
      .map(s => s.trim().split(/\s+as\s+/)[0]?.trim()) // gestisce eventuali `foo as bar`
      .filter((value): value is string => !!value)
      .forEach(name => alreadyImported.add(name));
  }

  const missingImports = requiredImports.filter(name => !alreadyImported.has(name));

  if (missingImports.length) {
    result = `import { ${missingImports.join(', ')} } from '@xaendar/core';

${result}`;
  }

  return result.replace(lastStaticBlock, (_, indent, initFn) => `${compiledMethods}\n  static {\n${indent}${initFn}();\n  }`);;
}
/**
 * Extracts the class name from the Babel-transpiled JS source.

 *
 * Babel always emits `class ClassName extends ...` so this is safe to match.
 * Used to generate a unique name for the per-class CSSStyleSheet variable
 * that must be declared outside the class body to guarantee it exists before
 * `connectedCallback` fires.
 *
 * @param jsSource - The Babel-transpiled JS source of the component.
 * @returns The class name, or `__Component` as a safe fallback.
 */
function extractClassName(jsSource: string): string {
  const match = jsSource.match(/class\s+(\w+)\s+extends/);
  return match?.[1] ?? '__Component';
}

/**
 * Builds the JS snippet that declares and populates the shared
 * `CSSStyleSheet` for the component class.
 *
 * The variable is declared outside the class body so it is fully
 * initialised before Babel's first `static {}` block runs — which is
 * where `customElements.define()` is called and may immediately trigger
 * `connectedCallback` if the element is already in the DOM.
 *
 * @param varName - The variable name for the shared `CSSStyleSheet`.
 * @param css - Raw CSS content to embed.
 * @returns A JS snippet string ending with a newline.
 */
function buildStyleSnippet(varName: string, css: string): string {
  const escaped = css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return [
    `const ${varName} = new CSSStyleSheet();`,
    `${varName}.replaceSync(\`${escaped}\`);`,
    '',
  ].join('\n');
}

/**
 * Workaround for an esbuild bug where stage-3 decorators combined with
 * `export` are emitted as `export @Decorator class Foo {}` instead of the
 * valid form `@Decorator\nexport class Foo {}`.
 *
 * Reorders the tokens so that the decorator always precedes the `export`
 * keyword, producing syntactically valid output.
 *
 * @param code - The transpiled source code to fix.
 * @returns The source code with corrected decorator/export ordering.
 */
function fixDecoratorExport(code: string): string {
  return code.replace(/^export\s+(@\w+[\s\S]*?)\s+(class\s)/gm, '$1\nexport $2');
}

/**
 * Loads the `tsconfig.json` compilerOptions applicable to the given
 * directory, using TypeScript's standard config file resolution
 * (`findConfigFile` walks up parent directories). Falls back to an empty
 * options object if no config file is found, rather than throwing —
 * type checking simply runs with default settings in that case.
 *
 * @param fromDir - Directory to start searching for `tsconfig.json` from,
 *   typically the directory of the component file being transformed.
 */
function loadCompilerOptions(fromDir: string): CompilerOptions {
  const configPath = findConfigFile(fromDir, sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    return {};
  }

  const configFile = readConfigFile(configPath, sys.readFile);
  const parsed = parseJsonConfigFileContent(configFile.config, sys, dirname(configPath));
  return parsed.options;
}

/**
 * Wraps the compiler's fictitious type-check body with the import of the
 * real component class and the `declare const root` binding, so the shim
 * type-checks the DSL expressions against the actual class members.
 *
 * The shim is generated as a sibling of the real component file (same
 * directory, `.__typecheck__.ts` suffix) so that the relative import below
 * resolves correctly via the LanguageServiceHost's standard module
 * resolution against the real filesystem.
 *
 * @param className - Name of the exported component class, as extracted
 *   from the transpiled source.
 * @param componentFilePath - Absolute path of the real component file.
 * @param body - The fictitious-TS type-check body produced by the compiler
 *   (the `function typeCheck() {...}` blocks and friends).
 * @returns The full shim source, ready to be passed to `updateVirtualFile`.
 */
function buildTypecheckShim(className: string, componentFilePath: string, body: string): string {
  const importSpecifier = `./${basename(componentFilePath, extname(componentFilePath))}`;

  return [
    `import { ${className} } from '${importSpecifier}';`,
    '',
    `declare const root: ${className};`,
    '',
    body,
  ].join('\n');
}

/**
 * Formats a single TS diagnostic into a human-readable, single-line message
 * including its location in the generated shim.
 *
 * Note: the location currently points into the generated shim file, not
 * the original DSL template — remapping to template positions is not yet
 * implemented (see the module-level doc comment on `xaendarPlugin`).
 */
function describeDiagnostic(diagnostic: Diagnostic): string {
  const message = flattenMessage(diagnostic);
  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return `${diagnostic.file.fileName}:${line + 1}:${character + 1} - ${message}`;
  }
  return message;
}

function flattenMessage(diagnostic: Diagnostic): string {
  return typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText;
}