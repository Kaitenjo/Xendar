import { isValidCustomElementName, slice } from '@xaendar/common';
import { compile, Cursor, resolveTemplateSpan, TypeCheckResult } from '@xaendar/compiler';
import { createShim, disposeLanguageService, extractClassName, extractDecoratorPaths, getLanguageService, loadCompilerOptions, registerRealFile, removeRealFile, removeVirtualFile } from '@xaendar/language-core';
import { dirname, resolve } from 'node:path';
import { CompilerOptions, Diagnostic } from 'typescript';
import type { Logger, Plugin } from 'vite';
import { COMPONENT_FILE_RE } from '../../costants/component-filename-regex';
import { clearImportRegistry, clearImportsForParent, findParentsForImport, registerImportMapping } from '../import-registry';
import { NodeCompilerHost } from '../node-compiler-host/node-compiler-host.model';
import { clearTemplateRegistry, findComponentForTemplate, registerTemplateMapping, removeAllMappingsForComponent, removeTemplateMapping } from '../template-registry';

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

  const logError = (message: string): void => {
    const redMessage = `\x1b[31m\rXaendar: ${message}\x1b[0m`;
    (logger ?? console).error(redMessage.replace(/^Error:\s*/, ''))
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
        if (typeof err === 'string') {
          logError(err);
        }
        return null;
      }

      const className = extractClassName(code)
      const { templatePath, stylePath } = extractDecoratorPaths(code, dirname(id));
      if (!templatePath || !host.fileExists(templatePath)) {
        this.warn(`Could not find template at ${templatePath}`);
        return null;
      }

      this.addWatchFile(templatePath);
      registerTemplateMapping(templatePath, id);
      const templateSource = host.readFile(templatePath);
      if (templateSource === undefined) {
        this.warn(`Could not read template at ${templatePath}`);
        return null;
      }

      clearImportsForParent(id);
      for (const importedPath of extractImportedComponentPaths(templateSource, dirname(templatePath))) {
        if (host.fileExists(importedPath)) {
          this.addWatchFile(importedPath);
          registerImportMapping(importedPath, id);
        }
      }

      let cssContent: string | undefined;

      if (stylePath && host.fileExists(stylePath)) {
        this.addWatchFile(stylePath);
        cssContent = host.readFile(stylePath);
      }

      let compiledMethods: string | undefined;
      let typecheckBody: TypeCheckResult | undefined;
      const varName = cssContent ? `__${className}_sheet` : undefined;

      try {
        const result = await compile(templateSource, { baseDir: dirname(templatePath), cssVariableName: varName });
        compiledMethods = result.javascript;
        typecheckBody = result.typescript;
      } catch (err) {
        logError(`Failed to compile template - ${templatePath}:\n${err instanceof Error ? err.message : err}`);
        return null;
      }

      let transformed: string | undefined;

      try {
        transformed = fixDecoratorExport(injectRenderMethods(code, compiledMethods, varName, cssContent));
      } catch (err) {
        if (typeof err === 'string') {
          logError(err);
        }
        return null;
      }

      compilerOptions ??= loadCompilerOptions(dirname(id));
      registerRealFile(id);

      const shim = createShim(new Map([['', [className]]]), typecheckBody);
      const languageService = getLanguageService(compilerOptions);
      const diagnostics = languageService.getSemanticDiagnostics(shim.path);

      for (let i = 0; i < diagnostics.length; i++) {
        logError(`Failed to compile template - ${templatePath}:\n${describeDiagnostic(templateSource, diagnostics[i], shim.bodyLineOffset, typecheckBody.mappingTable)}`);
      }

      // After logging every diagnostics we have to return null to raise an error
      if (diagnostics.length) {
        return null;
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
          removeAllMappingsForComponent(id);
          
          const parents = findParentsForImport(id);
          for (const parentId of parents) {
            removeVirtualFile(`${parentId}.__typecheck__.ts`);
            logError(`Component "${id}" was deleted but is still imported by "${parentId}". Update its @import statement.`);
          }
          clearImportsForParent(id);
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
        clearImportRegistry();
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
 * @throws When no selector is found, or when any selector is not a
 *   valid custom-element name.
 */
function assertValidCustomElementName(code: string, id: string): void {
  const selectorRegex = /selector:\s*('[^']*'|"[^"]*"|\[[^\]]*\])/;
  const match = code.match(selectorRegex);

  if (!match) {
    throw `No selector found in component ${id}\nMake sure the class has a @WebComponent decorator with a valid selector property`;
  }

  const raw = match[1];
  const selectors = raw.startsWith('[')
    ? [...raw.matchAll(/'([^']*)'|"([^"]*)"/g)].map(match => (match[1] ?? match[2])!)
    : [slice(raw, 1, -1)];

  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    if (!isValidCustomElementName(selector)) {
      throw `Invalid custom element name "${selector}" in component ${id}`;
    }
  }
}

/**
 * TODO: This could be eliminated if we find a way to extract the metadata informations
 * from the AST after the compile function has been invoked.
 * Currently we watch the improted files BEFORE compile function has been called, making
 * this optimization impossible.
 * When a global cache of the import metadata will be implemented we can safely remove this
 * 
 * Extracts the absolute paths of every component declared via `@import { X }
 * from '...'` inside a DSL template, resolving them relative to the
 * template's own directory (paths in the template are relative to the
 * .html file, not to the component's .ts file).
 *
 * @param templateSource - The raw content of the `.xd.component.html` template.
 * @param templateDir - The directory containing the template file.
 * @returns The list of imported absolute paths (may be empty).
 */
function extractImportedComponentPaths(templateSource: string, templateDir: string): string[] {
  const importRegex = /@import\s*\{[^}]*\}\s*from\s*['"](.+?)['"]/g;
  const paths = new Array<string>();
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(templateSource)) !== null) {
    paths.push(resolve(templateDir, match[1]));
  }

  return paths;
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
 * @throws When the placeholder is not found in the source — this
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
    throw 'Could not find the static initializer block in the transpiled output. Make sure @rolldown/plugin-babel with @babel/plugin-proposal-decorators runs before xaendarPlugin() in your Vite config.';
  }

  const requiredImports = ['effect', '_if', '_switch', '_for', 'Context', '_iterationVariables', '_renderElement', '_renderText', '_renderLiteralText', 'createElement', 'createSVGElement', 'createMATHMLElement'];

  const alreadyImported = new Set<string>();
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(result)) !== null) {
    const parts = match[1]?.split(',');
    if (parts) {
      for (let i = 0; i < parts.length; i++) {
        const name = parts[i].trim().split(/\s+as\s+/)[0]?.trim();
        if (name) {
          alreadyImported.add(name);
        }
      }
    }
  }

  const missingImports = requiredImports.filter(name => !alreadyImported.has(name));

  if (missingImports.length) {
    result = `import { ${missingImports.join(', ')} } from '@xaendar/core';

${result}`;
  }

  return result.replace(lastStaticBlock, (_, indent, initFn) => `${compiledMethods}\n  static {\n${indent}${initFn}();\n  }`);;
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
 * Formats a single TS diagnostic into a human-readable, single-line message
 * including its location in the generated shim.
 *
 * Note: the location currently points into the generated shim file, not
 * the original DSL template — remapping to template positions is not yet
 * implemented (see the module-level doc comment on `xaendarPlugin`).
 */
function describeDiagnostic(templateSource: string, diagnostic: Diagnostic, bodyLineOffset: number, mappingTable: TypeCheckResult['mappingTable']): string {
  const message = typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText;
  const cursor = new Cursor(templateSource);
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message;
  }

  const shimPosition = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const bodyLine = shimPosition.line - bodyLineOffset;
  if (bodyLine < 0) {
    return message;
  }

  const templateSpan = resolveTemplateSpan(mappingTable, { line: bodyLine, character: shimPosition.character });
  if (!templateSpan) {
    return message;
  }

  const templatePosition = cursor.getPositionFromCharacterIndex(templateSpan.start);
  return `${templatePosition} - ${message}\n ---> ${slice(templateSource, templateSpan.start, templateSpan.end)}`;
}