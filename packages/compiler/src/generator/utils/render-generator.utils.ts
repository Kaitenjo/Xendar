import ts, { Expression } from 'typescript';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { CompilerContext } from '../models/compiler-context.model';

/**
 * Complete set of JavaScript global identifiers up to ES2026.
 *
 * These are identifiers that TypeScript's parser classifies as
 * `SyntaxKind.Identifier` (unlike true keywords such as `typeof`,
 * `instanceof`, `true`, `false`, `null` which have their own SyntaxKind)
 * but that must never be prefixed with `this.` inside a template expression
 * because they refer to well-known globals, not to component properties.
 *
 * Organised by ECMAScript category, mirroring the MDN "Standard built-in
 * objects" reference, plus the ES2026 additions (Temporal, DisposableStack,
 * AsyncDisposableStack, SuppressedError, Math.sumPrecise surface).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
 */
export const GLOBAL_IDENTIFIERS: ReadonlySet<string> = new Set([
  // ---- Value properties ------------------------------------------------
  // true, false, null are SyntaxKind keywords — not needed here.
  'undefined',
  'NaN',
  'Infinity',
  'globalThis',

  // ---- Global functions ------------------------------------------------
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  // Deprecated but still Identifiers in TS
  'escape',
  'unescape',

  // ---- Fundamental objects ---------------------------------------------
  'Object',
  'Function',
  'Boolean',
  'Symbol',

  // ---- Error objects ---------------------------------------------------
  'Error',
  'AggregateError',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'SuppressedError',       // ES2026 — explicit resource management
  'InternalError',         // Non-standard (Firefox) but common

  // ---- Numbers and dates -----------------------------------------------
  'Number',
  'BigInt',
  'Math',
  'Date',
  'Temporal',              // ES2026 — replaces Date

  // ---- Text processing -------------------------------------------------
  'String',
  'RegExp',

  // ---- Indexed collections ---------------------------------------------
  'Array',
  'TypedArray',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'BigInt64Array',
  'BigUint64Array',
  'Float16Array',          // ES2025
  'Float32Array',
  'Float64Array',

  // ---- Keyed collections -----------------------------------------------
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',

  // ---- Structured data -------------------------------------------------
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Atomics',
  'JSON',

  // ---- Memory management -----------------------------------------------
  'WeakRef',
  'FinalizationRegistry',

  // ---- Control abstractions --------------------------------------------
  'Iterator',              // ES2025
  'AsyncIterator',         // ES2025
  'Promise',
  'GeneratorFunction',
  'AsyncGeneratorFunction',
  'Generator',
  'AsyncGenerator',
  'AsyncFunction',
  'DisposableStack',       // ES2026 — explicit resource management
  'AsyncDisposableStack',  // ES2026 — explicit resource management

  // ---- Reflection ------------------------------------------------------
  'Reflect',
  'Proxy',

  // ---- Internationalization --------------------------------------------
  'Intl',

  // ---- WebAssembly -----------------------------------------------------
  'WebAssembly',

  // ---- Browser / DOM globals -------------------------------------------
  // These are not part of the ECMAScript spec but are universally available
  // in browser environments and must not be treated as component properties.
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'screen',
  'console',
  'performance',
  'crypto',
  'fetch',
  'alert',
  'confirm',
  'prompt',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'queueMicrotask',
  'structuredClone',
  'URL',
  'URLSearchParams',
  'FormData',
  'Headers',
  'Request',
  'Response',
  'AbortController',
  'AbortSignal',
  'CustomEvent',
  'Event',
  'EventTarget',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'PerformanceObserver',
  'Worker',
  'SharedWorker',
  'ServiceWorker',
  'Blob',
  'File',
  'FileReader',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'TextEncoder',
  'TextDecoder',
  'ImageData',
  'Canvas',
  'Storage',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'WebSocket',
  'XMLHttpRequest',

  // ---- DOM element constructors ----------------------------------------
  // Commonly used with instanceof in template expressions.
  'HTMLElement',
  'HTMLInputElement',
  'HTMLButtonElement',
  'HTMLFormElement',
  'HTMLAnchorElement',
  'HTMLImageElement',
  'HTMLVideoElement',
  'HTMLAudioElement',
  'HTMLCanvasElement',
  'HTMLSelectElement',
  'HTMLTextAreaElement',
  'HTMLDivElement',
  'HTMLSpanElement',
  'HTMLParagraphElement',
  'HTMLHeadingElement',
  'HTMLTableElement',
  'HTMLTableRowElement',
  'HTMLTableCellElement',
  'HTMLUListElement',
  'HTMLOListElement',
  'HTMLLIElement',
  'HTMLLabelElement',
  'HTMLDialogElement',
  'HTMLDetailsElement',
  'HTMLSlotElement',
  'HTMLTemplateElement',
  'SVGElement',
  'SVGSVGElement',
  'Element',
  'Node',
  'NodeList',
  'DocumentFragment',
  'ShadowRoot',
  'Document',
  'Window',
]);

export const ROOT_NODE = 'root';

/**
 * Resolves references to component properties inside a template expression.
 *
 * Identifiers that are not found in the active scope chain and are not
 * well-known globals are prefixed with `this.` so they resolve against
 * the component instance at runtime.
 *
 * The original formatting of the expression — parentheses, spacing,
 * operator tokens, member access dots — is preserved verbatim by delegating
 * to `node.getText()` for any subtree that contains no resolvable identifiers.
 *
 * @param expression - Either a raw identifier string or a validated
 *   `ts.Expression` node produced by `validateExpression`.
 * @param compilerContext - The active template scope context.
 * @returns The resolved expression as a JavaScript string ready for codegen.
 *
 * @example
 * // Simple identifier
 * resolveExpression('items', context) // → 'this.items'
 *
 * @example
 * // Complex expression — formatting preserved
 * resolveExpression(node, context)
 * // typeof id !== 'boolean' || pippo instanceof HTMLElement
 * // → typeof this.id !== 'boolean' || this.pippo instanceof HTMLElement
 */
export function resolveExpression(expression: Expression, compilerContext: CompilerContext): string {
  return emitNode(expression, expression, compilerContext);
}

/**
 * Emits the resolved text for a node.
 *
 * - If the node has no resolvable identifiers in its subtree, emits
 *   `node.getText()` verbatim — preserving all original spacing,
 *   parentheses, dots, and punctuation.
 * - If the node is a resolvable Identifier, emits the resolved name.
 * - Otherwise recurses into children and concatenates their output.
 */
function emitNode(node: ts.Node, parent: ts.Node, compilerContext: CompilerContext): string {
  // Leaf Identifier that needs resolution
  if (ts.isIdentifier(node) && needsResolution(node, parent)) {
    return compilerContext.hasIdentifier(node.text) ? node.text : `this.${node.text}`;
  }

  // No resolvable identifiers in this subtree — emit verbatim
  if (!containsResolvableIdentifier(node, parent)) {
    return node.getText();
  }

  /*
    Has resolvable identifiers — recurse into children and concatenate.
    We use the original source positions to reconstruct spacing between
    children faithfully instead of joining with a fixed separator.
  */
  const sourceText = node.getSourceFile().text;
  let result = '';
  let lastEnd = node.getStart();

  ts.forEachChild(node, child => {
    result = `${result}${sourceText.slice(lastEnd, child.getStart())}${emitNode(child, node, compilerContext)}`;
    lastEnd = child.getEnd();
  });

  // Append any trailing text after the last child (e.g. closing paren)
  return `${result}${sourceText.slice(lastEnd, node.getEnd())}`;
}

/**
 * Returns true if the subtree rooted at `node` contains at least one
 * Identifier that needs context resolution.
 *
 * Short-circuits as soon as one is found to avoid visiting the whole tree.
 */
function containsResolvableIdentifier(node: ts.Node, parent: ts.Node): boolean {
  if (ts.isIdentifier(node) && needsResolution(node, parent)) {
    return true;
  }

  let found = false;

  ts.forEachChild(node, child => {
    if (!found) {
      found = containsResolvableIdentifier(child, node);
    }
  });

  return found;
}

/**
 * Returns true if the identifier needs to be resolved against the context
 * or prefixed with `this.` — i.e. it is not a global/builtin identifier
 * and not the property-name side of a member access expression.
 */
function needsResolution(node: ts.Identifier, parent: ts.Node): boolean {
  return !((ts.isPropertyAccessExpression(parent) && parent.name === node) || GLOBAL_IDENTIFIERS.has(node.text));
}

/**
 * Generates a unique variable name for a DOM element based on its tag name
 * and parent node context.
 *
 * When the parent is the root node (`this._root`), the identifier is based
 * solely on the tag name; otherwise the parent name is prepended to ensure
 * uniqueness within nested structures. Hyphens in tag names are replaced
 * with underscores to produce a valid JavaScript identifier.
 *
 * @param node - The `ElementNode` for which to generate the identifier.
 * @param parentNode - The variable name of the parent node.
 * @param index - A numeric suffix to disambiguate sibling elements of the same type.
 * @returns A unique variable name string for the element.
 */
export function getElementIdentifier(node: ElementNode, parentNode: string, index: string): string {
  return getIdentifier(node.tagName, parentNode, index);
}

/**
 * Generates a unique variable name for a text or interpolation node.
 *
 * @param prefix - Optional prefix to use instead of the default `'text'`.
 * @param parentNode - The variable name of the parent node.
 * @param index - A numeric suffix to disambiguate sibling text nodes.
 * @returns A unique variable name string for the text node.
 */
export function getTextIdentifier(prefix = 'text', parentNode: string, index: string): string {
  return getIdentifier(prefix, parentNode, index);
}

/**
 * Generates a unique variable name for a control-flow block (if, else-if, else,
 * for, switch, case, or default).
 *
 * @param prefix - The block type prefix (`'if'`, `'elseIf'`, `'else'`, etc.).
 * @param parentNode - The variable name of the parent node.
 * @param index - A suffix to disambiguate sibling blocks.
 * @returns A unique variable name string for the block.
 */
export function getBlockIdentifier(prefix: 'if' | 'elseIf' | 'else' | 'for' | 'switch' | 'case' | 'default', parentNode: string, index: string): string {
  return getIdentifier(prefix, parentNode, index);
}

function getIdentifier(prefix: string, parentNode: string, index: string): string {
  const identifier = parentNode !== ROOT_NODE ? `${parentNode}__${prefix}${index}` : `${prefix}${index}`;
  return identifier.replace(/-/g, '_');
}
