import { isValidCustomElementName } from '@xaendar/common';
import { compile } from '@xaendar/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { xaendarPlugin } from './plugin';

const { mockFileExists, mockReadFile } = vi.hoisted(() => ({
  mockFileExists: vi.fn(),
  mockReadFile: vi.fn(),
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
  let callTransform: (code: string, id: string) => unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(isValidCustomElementName).mockReturnValue(true);
    mockFileExists.mockReturnValue(false);
    mockReadFile.mockReturnValue(undefined);

    const plugin = xaendarPlugin();
    context = makeContext();
    // Necessary cast because transform can be either a function or an object with an `handler` property, but in our case it's always a function.
    const fn = plugin.transform! as Function;
    callTransform = (code, id) => fn.call(context, code, id);
  });

  it('exposes the correct plugin name', () => {
    expect(xaendarPlugin().name).toBe('xaendar');
  });

  describe('file filtering', () => {
    it('returns null for plain .ts files', () => {
      expect(callTransform('', 'app.ts')).toBeNull();
    });

    it('returns null for .component.ts files without the xd prefix', () => {
      expect(callTransform('', 'my-comp.component.ts')).toBeNull();
    });

    it('returns null for the template html file itself', () => {
      expect(callTransform('', 'my-comp.xd.component.html')).toBeNull();
    });

    it('processes files matching .xd.component.ts', () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);

      const result = callTransform(BASE_CODE, COMPONENT_ID);

      expect(result).not.toBeNull();
    });
  });

  describe('selector validation', () => {
    it('throws when no @WebComponent selector is found', () => {
      const code = `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;
      expect(() => callTransform(code, COMPONENT_ID)).toThrow(
        'Xaendar: no selector found',
      );
    });

    it('throws when the selector is not a valid custom element name', () => {
      vi.mocked(isValidCustomElementName).mockReturnValue(false);
      const code = buildComponentCode('mycomponent', './my-comp.xd.component.html');

      expect(() => callTransform(code, COMPONENT_ID)).toThrow(
        'Xaendar: invalid custom element name "mycomponent"',
      );
    });

    it('validates each selector when the decorator uses an array', () => {
      vi.mocked(isValidCustomElementName)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const code =
        `@WebComponent({ selector: ['my-comp', 'bad'] })\n` +
        `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;

      expect(() => callTransform(code, COMPONENT_ID)).toThrow(
        'Xaendar: invalid custom element name "bad"',
      );
    });

    it('validates each selector when the array uses double-quoted strings (match[2] branch)', () => {
      vi.mocked(isValidCustomElementName)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const code =
        `@WebComponent({ selector: ["my-comp", "bad"] })\n` +
        `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;

      expect(() => callTransform(code, COMPONENT_ID)).toThrow(
        'Xaendar: invalid custom element name "bad"',
      );
    });

    it('accepts double-quoted selectors', () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);

      const code =
        `@WebComponent({ selector: "my-comp", templateUrl: "./my-comp.xd.component.html" })\n` +
        `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;

      expect(() => callTransform(code, COMPONENT_ID)).not.toThrow();
    });
  });

  // ── Template resolution ──────────────────────────────────────────────────

  describe('template resolution', () => {
    it('warns and returns null when templateUrl is missing from the decorator', () => {
      const code =
        `@WebComponent({ selector: 'my-comp' })\n` +
        `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;

      const result = callTransform(code, COMPONENT_ID);

      expect(context.warn).toHaveBeenCalledWith(
        expect.stringContaining('could not find template'),
      );
      expect(result).toBeNull();
    });

    it('warns and returns null when the template file does not exist on disk', () => {
      mockFileExists.mockReturnValue(false);

      const result = callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.warn).toHaveBeenCalledWith(
        expect.stringContaining('could not find template'),
      );
      expect(result).toBeNull();
    });

    it('warns and returns null when the template file cannot be read', () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(undefined);

      const result = callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.warn).toHaveBeenCalledWith(
        expect.stringContaining('could not read template'),
      );
      expect(result).toBeNull();
    });

    it('registers the template as a watch file', () => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);

      callTransform(BASE_CODE, COMPONENT_ID);

      expect(context.addWatchFile).toHaveBeenCalledWith(
        expect.stringContaining('my-comp.xd.component.html'),
      );
    });
  });

  // ── Compilation ──────────────────────────────────────────────────────────

  describe('compilation', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
    });

    it('passes the template source to the compiler', () => {
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);

      callTransform(BASE_CODE, COMPONENT_ID);

      expect(compile).toHaveBeenCalledWith(TEMPLATE_SOURCE, undefined);
    });

    it('throws via this.error when the compiler throws', () => {
      vi.mocked(compile).mockImplementation(() => {
        throw new Error('unexpected token');
      });

      expect(() => callTransform(BASE_CODE, COMPONENT_ID)).toThrow(
        'Xaendar: failed to compile template',
      );
    });
  });

  describe('render method injection', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);
    });

    it('throws via this.error when the static initializer block is missing', () => {
      const codeWithoutBlock =
        `@WebComponent({ selector: 'my-comp', templateUrl: './my-comp.xd.component.html' })\n` +
        `class MyComponent extends HTMLElement {}`;

      expect(() => callTransform(codeWithoutBlock, COMPONENT_ID)).toThrow(
        'static initializer block',
      );
    });

    it('injects the compiled methods into the output', () => {
      const result = callTransform(BASE_CODE, COMPONENT_ID) as { code: string };

      expect(result.code).toContain(COMPILED_METHODS);
    });

    it('adds the effect import at the top of the transformed file', () => {
      const result = callTransform(BASE_CODE, COMPONENT_ID) as { code: string };

      expect(result.code).toMatch(/^import { effect, _if, _switch, _for, Context, _iterationVariables, _renderElement, _renderText, _renderLiteralText, SVG_NS, MATHML_NS } from '@xaendar\/core'/);
    });

    it('preserves the static initializer call in the output', () => {
      const result = callTransform(BASE_CODE, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('__init();');
    });

    it('returns an object with a code property', () => {
      const result = callTransform(BASE_CODE, COMPONENT_ID);

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
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);
    }

    it('injects a CSSStyleSheet declaration when styleUrl is present and the file exists', () => {
      setupWithCss();
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      const result = callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('new CSSStyleSheet()');
      expect(result.code).toContain(CSS_CONTENT);
    });

    it('does not inject CSS when the style file does not exist on disk', () => {
      mockFileExists.mockImplementation((path: string) => path.endsWith('.html'));
      mockReadFile.mockImplementation((path: string) =>
        path.endsWith('.html') ? TEMPLATE_SOURCE : undefined,
      );
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);

      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);
      const result = callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).not.toContain('CSSStyleSheet');
    });

    it('passes the CSS variable name to the compiler when CSS is present', () => {
      setupWithCss();
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      callTransform(code, COMPONENT_ID);

      expect(compile).toHaveBeenCalledWith(
        TEMPLATE_SOURCE,
        expect.stringMatching(/_sheet$/),
      );
    });

    it('registers the CSS file as a watch file when it exists', () => {
      setupWithCss();
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      callTransform(code, COMPONENT_ID);

      expect(context.addWatchFile).toHaveBeenCalledWith(
        expect.stringContaining('.css'),
      );
    });

    it('escapes backticks in the injected CSS', () => {
      setupWithCss('content: "`hello`";');
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      const result = callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('\\`');
    });

    it('escapes template literal expressions in the injected CSS', () => {
      setupWithCss('content: "${value}";');
      const code = buildComponentCode('my-comp', './my-comp.xd.component.html', STYLE_URL);

      const result = callTransform(code, COMPONENT_ID) as { code: string };

      expect(result.code).toContain('\\${');
    });
  });

  describe('fixDecoratorExport', () => {
    beforeEach(() => {
      mockFileExists.mockReturnValue(true);
      mockReadFile.mockReturnValue(TEMPLATE_SOURCE);
      vi.mocked(compile).mockReturnValue(COMPILED_METHODS);
    });

    it('rewrites "export @Decorator class" to "@Decorator\\nexport class"', () => {
      // Simulates esbuild output where `export` is emitted before the decorator
      const buggyCode =
        `export @WebComponent({\n  selector: 'my-comp',\n  templateUrl: './my-comp.xd.component.html'\n})\n` +
        `class MyComponent extends HTMLElement {\n  static {\n    __init();\n  }\n}`;

      const result = callTransform(buggyCode, COMPONENT_ID) as { code: string };

      expect(result.code).not.toContain('export @');
      expect(result.code).toMatch(/@WebComponent[\s\S]+\nexport class/);
    });
  });
});
