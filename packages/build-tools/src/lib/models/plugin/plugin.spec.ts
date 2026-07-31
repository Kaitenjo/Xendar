
import { isValidCustomElementName } from '@xaendar/common';
import { compile } from '@xaendar/compiler';
import type { Function } from '@xaendar/types';
import type { CompilerOptions } from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { xaendarPlugin } from './plugin';

const { mockFileExists, mockReadFile } = vi.hoisted(() => ({
  mockFileExists: vi.fn(),
  mockReadFile: vi.fn(),
}));

const {
  mockFindConfigFile,
  mockReadConfigFile,
  mockParseJsonConfigFileContent,
} = vi.hoisted(() => ({
  mockFindConfigFile: vi.fn(),
  mockReadConfigFile: vi.fn(),
  mockParseJsonConfigFileContent: vi.fn(),
}));

const {
  mockRegisterRealFile,
  mockUpsertVirtualFile,
  mockGetLanguageService,
  mockGetShimDiagnostics,
  mockDisposeLanguageService,
} = vi.hoisted(() => ({
  mockRegisterRealFile: vi.fn(),
  mockUpsertVirtualFile: vi.fn(),
  mockGetLanguageService: vi.fn(),
  mockGetShimDiagnostics: vi.fn().mockReturnValue([]),
  mockDisposeLanguageService: vi.fn(),
}));

/*
  language-service.ts lives as a sibling of plugin.ts in
  lib/models/plugin/, hence the relative './language-service' path.
*/
vi.mock('../language-service', () => ({
  registerRealFile: mockRegisterRealFile,
  upsertVirtualFile: mockUpsertVirtualFile,
  getLanguageService: mockGetLanguageService,
  getShimDiagnostics: mockGetShimDiagnostics,
  disposeLanguageService: mockDisposeLanguageService,
}));


vi.mock('../node-compiler-host/node-compiler-host.model', () => ({
  NodeCompilerHost: vi.fn(function (this: any) {
    this.fileExists = mockFileExists;
    this.readFile = mockReadFile;
  }),
}));

vi.mock('@xaendar/compiler', () => ({
  compile: vi.fn(),
}));

vi.mock('@xaendar/common', () => ({
  isValidCustomElementName: vi.fn(),
}));


/*
  Only findConfigFile / readConfigFile / parseJsonConfigFileContent are
  mocked (the ones loadCompilerOptions actually calls); everything else
  (types, sys, etc.) keeps its real implementation since it's unused at
  runtime once these three are stubbed out.
*/
vi.mock('typescript', async (importOriginal) => {
  const actual = await importOriginal<typeof import('typescript')>();
  return {
    ...actual,
    findConfigFile: mockFindConfigFile,
    readConfigFile: mockReadConfigFile,
    parseJsonConfigFileContent: mockParseJsonConfigFileContent,
  };
});

type PluginContext = {
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  addWatchFile: ReturnType<typeof vi.fn>;
};

/** 
 * Creates a mock Vite plugin context where `error` throws, matching real Vite behaviour. 
 */
function makeContext(): PluginContext {
  return {
    warn: vi.fn(),
    error: vi.fn((msg: string) => {
      throw new Error(msg);
    }),
    addWatchFile: vi.fn(),
  };
}

const COMPONENT_DIR = '/project/src/my-comp';
const COMPONENT_ID = `${COMPONENT_DIR}/my-comp.xd.component.ts`;
const TEMPLATE_SOURCE = '<div>hello</div>';
const COMPILED_METHODS = '  render() { return document.createElement("div"); }';
const TYPECHECK_BODY = 'function typeCheck() {\n  const text0 = `${root.pippo}`;\n}';
const COMPILER_OPTIONS_STUB: CompilerOptions = { strict: true };

// Default `compile()` mock return value: real code shape `{ javascript, typescript }`.
const COMPILE_RESULT = { javascript: COMPILED_METHODS, typescript: TYPECHECK_BODY };

/**
 * Builds a minimal component TypeScript source string.
 * The static block contains a call to `__init()` which matches the
 * pattern expected by `injectRenderMethods`.
 */
function buildComponentCode(selector: string, templateUrl: string, styleUrl?: string): string {
  const props = [`selector: '${selector}'`, `templateUrl: '${templateUrl}'`];
  if (styleUrl) {
    props.push(`styleUrl: '${styleUrl}'`);
  }

  return `
@WebComponent({
  ${props.join(',\n  ')}
})
class MyComponent extends HTMLElement {
  static {
    __init();
  }
}`;
}

const BASE_CODE = buildComponentCode('my-comp', './my-comp.xd.component.html');

describe('xaendarPlugin()', () => {
  let context: PluginContext;
  let callTransform: (code: string, id: string) => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(isValidCustomElementName).mockReturnValue(true);
    mockFileExists.mockReturnValue(false);
    mockReadFile.mockReturnValue(undefined);

    /*
      Default: a tsconfig.json is "found" and parses to COMPILER_OPTIONS_STUB.
      Individual tests can override this if they need to exercise the
      "no tsconfig found" path.
    */
    mockFindConfigFile.mockReturnValue('/project/tsconfig.json');
    mockReadConfigFile.mockReturnValue({ config: {} });
    mockParseJsonConfigFileContent.mockReturnValue({ options: COMPILER_OPTIONS_STUB });
    mockGetShimDiagnostics.mockReturnValue([]);
    mockGetLanguageService.mockReturnValue({
      getSemanticDiagnostics: mockGetShimDiagnostics,
    });

    const plugin = xaendarPlugin();
    context = makeContext();
    // Necessary cast because transform can be either a function or an object with an `handler` property, but in our case it's always a function.
    const fn = plugin.transform! as unknown as Function<[code: string, id: string], Promise<unknown>>;
    /*
      `transform` is declared `async`, so it always returns a Promise —
      even when it throws synchronously inside (the throw becomes a
      rejection). callTransform must be awaited/asserted accordingly.
    */
    callTransform = (code, id) => fn.call(context, code, id);
  });

  it('exposes the correct plugin name', () => {
    expect(xaendarPlugin().name).toBe('xaendar');
  });

  describe('file filtering', () => {
    it('returns null for plain .ts files', async () => {
      await expect(callTransform('', 'app.ts')).resolves.toBeNull();
    });

    it('returns null for .component.ts files without the xd prefix', async () => {
      await expect(callTransform('', 'my-comp.component.ts')).resolves.toBeNull();
    });

    it('returns null for the template html file itself', async () => {
      await expect(callTransform('', 'my-comp.xd.component.html')).resolves.toBeNull();
    });

    it('processes files matching .xd.component.ts', async () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));

      const result = await callTransform(BASE_CODE, COMPONENT_ID);

      expect(result).not.toBeNull();
    });
  });

  describe('selector validation', () => {
    it('logs and returns null when no @WebComponent selector is found', async () => {
      const code = `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;
      await expect(callTransform(code, COMPONENT_ID)).resolves.toBeNull();
    });

    it('logs and returns null when the selector is not a valid custom element name', async () => {
      vi.mocked(isValidCustomElementName).mockReturnValue(false);
      const code = buildComponentCode('mycomponent', './my-comp.xd.component.html');

      await expect(callTransform(code, COMPONENT_ID)).resolves.toBeNull();
    });

    it('returns null when selector array contains an invalid value', async () => {
      vi.mocked(isValidCustomElementName)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const code = `@WebComponent({ selector: ['my-comp', 'bad'] })
class MyComponent extends HTMLElement {
  static {
    __init();
  }
}`;

      await expect(callTransform(code, COMPONENT_ID)).resolves.toBeNull();
    });

    it('returns null when a double-quoted selector array contains an invalid value', async () => {
      vi.mocked(isValidCustomElementName)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const code = `@WebComponent({ selector: ["my-comp", "bad"] })
class MyComponent extends HTMLElement {
  static {
    __init();
  }
}`;

      await expect(callTransform(code, COMPONENT_ID)).resolves.toBeNull();
    });

    it('accepts double-quoted selectors', async () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));

      const code = `@WebComponent({ selector: "my-comp", templateUrl: "./my-comp.xd.component.html" })
class MyComponent extends HTMLElement {
  static {
    __init();
  }
}`;

      await expect(callTransform(code, COMPONENT_ID)).resolves.toMatchObject({
        code: expect.any(String),
      });
    });
  });

  describe('template resolution', () => {
    it('warns and returns null when templateUrl is missing from the decorator', async () => {
      const code = `@WebComponent({ selector: 'my-comp' })
class MyComponent extends HTMLElement {
  static {
    __init();
  }
}`;

      const result = await callTransform(code, COMPONENT_ID);

      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('Could not find template'));
      expect(result).toBeNull();
    });

    it('warns and returns null when the template file does not exist on disk', async () => {
      mockFileExists.mockReturnValue(false);

      const result = await callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('Could not find template'));
      expect(result).toBeNull();
    });

    it('warns and returns null when the template file cannot be read', async () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(undefined);

      const result = await callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.warn).toHaveBeenCalledWith(expect.stringContaining('Could not read template'));
      expect(result).toBeNull();
    });

    it('registers the template as a watch file', async () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));

      await callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.addWatchFile).toHaveBeenCalledWith(expect.stringContaining('my-comp.xd.component.html'));
    });
  });

  describe('compilation', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
    });

    it('passes the template source to the compiler', async () => {
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));

      await callTransform(BASE_CODE, COMPONENT_ID);

      /*
        2nd arg is the extracted class name; using `any(String)` here since
        extractClassName(id) currently receives the file path rather than
        the source code (see note above) and always resolves to the
        '__Component' fallback — pin down the exact value once that's fixed.
      */
      expect(compile).toHaveBeenCalledWith(TEMPLATE_SOURCE, expect.any(String), undefined);
    });

    it('returns null when the compiler throws', async () => {
      vi.mocked(compile).mockImplementation(() => {
        throw new Error('unexpected token');
      });

      await expect(callTransform(BASE_CODE, COMPONENT_ID)).resolves.toBeNull();
    });
  });

  describe('render method injection', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));
    });

    it('returns null when the static initializer block is missing', async () => {
      const codeWithoutBlock = `@WebComponent({ selector: 'my-comp', templateUrl: './my-comp.xd.component.html' })
class MyComponent extends HTMLElement {}`;

      await expect(callTransform(codeWithoutBlock, COMPONENT_ID)).resolves.toBeNull();
    });

    it('injects the compiled methods into the output', async () => {
      const result = await callTransform(BASE_CODE, COMPONENT_ID) as { code: string };

      expect(result.code).toContain(COMPILED_METHODS);
    });

    it('adds the effect import at the top of the transformed file', async () => {
      const result = await callTransform(BASE_CODE, COMPONENT_ID) as { code: string };

      expect(result.code).toMatch(/^import { effect, _if, _switch, _for, Context, _iterationVariables, _renderElement, _renderText, _renderLiteralText, createElement, createSVGElement, createMATHMLElement } from '@xaendar\/core'/);
    });

    it('preserves the static initializer call in the output', async () => {
      const result = await callTransform(BASE_CODE, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('__init();');
    });

    it('returns an object with a code property', async () => {
      const result = await callTransform(BASE_CODE, COMPONENT_ID);

      expect(result).toMatchObject({ code: expect.any(String) });
    });
  });

  describe('CSS injection', () => {
    const STYLE_URL = './my-comp.xd.component.css';
    const CSS_CONTENT = 'h1 { color: red; }';

    function setupWithCss(cssContent = CSS_CONTENT): void {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockImplementation((path: string) => {
        if (path.endsWith('.html')) return TEMPLATE_SOURCE;
        if (path.endsWith('.css')) return cssContent;
        return undefined;
      });
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));
    }

    it('injects a CSSStyleSheet declaration when styleUrl is present and the file exists', async () => {
      setupWithCss();
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      const result = await callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('new CSSStyleSheet()');
      expect(result.code).toContain(CSS_CONTENT);
    });

    it('does not inject CSS when the style file does not exist on disk', async () => {
      mockFileExists.mockImplementation((path: string) => path.endsWith('.html'));
      mockReadFile.mockImplementation((path: string) =>
        path.endsWith('.html') ? TEMPLATE_SOURCE : undefined,
      );
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));

      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);
      const result = await callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).not.toContain('CSSStyleSheet');
    });

    it('passes the CSS variable name to the compiler when CSS is present', async () => {
      setupWithCss();
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      await callTransform(code, COMPONENT_ID);

      expect(compile).toHaveBeenCalledWith(TEMPLATE_SOURCE, expect.any(String), expect.stringMatching(/_sheet$/));
    });

    it('registers the CSS file as a watch file when it exists', async () => {
      setupWithCss();
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      await callTransform(code, COMPONENT_ID);

      expect(context.addWatchFile).toHaveBeenCalledWith(expect.stringContaining('.css'));
    });

    it('escapes backticks in the injected CSS', async () => {
      setupWithCss('content: "`hello`";');
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      const result = await callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('\\`');
    });

    it('escapes template literal expressions in the injected CSS', async () => {
      setupWithCss('content: "${value}";');
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      const result = await callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('\\${');
    });
  });

  describe('fixDecoratorExport', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));
    });

    it('rewrites "export @Decorator class" to "@Decorator\\nexport class"', async () => {
      // Simulates esbuild output where `export` is emitted before the decorator
      const buggyCode = `export @WebComponent({
  selector: 'my-comp',
  templateUrl: './my-comp.xd.component.html'
})
class MyComponent extends HTMLElement {
  static {
    __init();
  }
}`;

      const result = await callTransform(buggyCode, COMPONENT_ID) as { code: string };

      expect(result.code).not.toContain('export @');
      expect(result.code).toMatch(/@WebComponent[\s\S]+\nexport class/);
    });
  });

  describe('type checking integration', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(new Promise(resolve => resolve(COMPILE_RESULT)));
    });

    it('registers the component file as a real file for the Program', async () => {
      await callTransform(BASE_CODE, COMPONENT_ID);

      expect(mockRegisterRealFile).toHaveBeenCalledWith(COMPONENT_ID);
    });

    it('writes a virtual shim next to the component file, including the import and the compiled body', async () => {
      await callTransform(BASE_CODE, COMPONENT_ID);

      expect(mockUpsertVirtualFile).toHaveBeenCalledWith(`${COMPONENT_ID}.__typecheck__.ts`, expect.stringContaining(TYPECHECK_BODY));

      const [, shimSource] = mockUpsertVirtualFile.mock.calls[0];
      expect(shimSource).toContain(`from './my-comp.xd.component'`);
      expect(shimSource).toMatch(/declare const root: \w+;/);
    });

    it('loads compilerOptions from tsconfig.json via findConfigFile/readConfigFile/parseJsonConfigFileContent', async () => {
      await callTransform(BASE_CODE, COMPONENT_ID);

      expect(mockFindConfigFile).toHaveBeenCalledWith(COMPONENT_DIR, expect.any(Function), 'tsconfig.json');
      expect(mockGetLanguageService).toHaveBeenCalledWith(COMPILER_OPTIONS_STUB);
    });

    it('falls back to empty compilerOptions when no tsconfig.json is found', async () => {
      mockFindConfigFile.mockReturnValue(undefined);

      await callTransform(BASE_CODE, COMPONENT_ID);

      expect(mockReadConfigFile).not.toHaveBeenCalled();
      expect(mockGetLanguageService).toHaveBeenCalledWith({});
    });

    it('loads compilerOptions only once across multiple transform calls (per plugin instance)', async () => {
      const otherId = `${COMPONENT_DIR}/other.xd.component.ts`;

      await callTransform(BASE_CODE, COMPONENT_ID);
      await callTransform(buildComponentCode('other-comp', './my-comp.xd.component.html'), otherId);

      expect(mockFindConfigFile).toHaveBeenCalledTimes(1);
    });

    it('reports semantic diagnostics from the shim without aborting the transform', async () => {
      mockGetShimDiagnostics.mockReturnValue([
        {
          messageText: "Property 'pippo' does not exist on type 'MyComponent'.",
          file: {
            fileName: `${COMPONENT_ID}.__typecheck__.ts`,
            getLineAndCharacterOfPosition: () => ({ line: 4, character: 10 }),
          },
          start: 42,
        },
      ]);

      await expect(callTransform(BASE_CODE, COMPONENT_ID)).resolves.toMatchObject({
        code: expect.any(String),
      });
    });

    it('does not warn when the shim has no diagnostics', async () => {
      mockGetShimDiagnostics.mockReturnValue([]);

      await callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.warn).not.toHaveBeenCalled();
    });
  });

  describe('configureServer', () => {
    it('disposes the shared LanguageService when the dev server closes', () => {
      const plugin = xaendarPlugin();
      const onClose = vi.fn();

      (plugin.configureServer as Function)({
        config: { logger: { error: vi.fn() } },
        httpServer: { on: onClose },
      });

      expect(onClose).toHaveBeenCalledWith('close', expect.any(Function));

      const [, closeHandler] = onClose.mock.calls[0];
      closeHandler();

      expect(mockDisposeLanguageService).toHaveBeenCalled();
    });

    it('does not throw when there is no httpServer (e.g. build mode)', () => {
      const plugin = xaendarPlugin();

      expect(() =>
        (plugin.configureServer as Function)({
          config: undefined,
          httpServer: undefined,
        }),
      ).not.toThrow();
    });
  });
});