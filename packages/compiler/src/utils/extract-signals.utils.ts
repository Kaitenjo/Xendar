import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path';
import { ClassDeclaration, ClassLikeDeclaration, EntityName, Expression, ImportDeclaration, PropertyDeclaration, ScriptTarget, SourceFile, SyntaxKind, createSourceFile, forEachChild, getDecorators, isCallExpression, isClassDeclaration, isHeritageClause, isIdentifier, isImportDeclaration, isNamedImports, isNamespaceImport, isPropertyAccessExpression, isPropertyDeclaration, isQualifiedName, isStringLiteralLike, isTypeReferenceNode } from 'typescript';
import { getClassAndWebComponentDeclarationsByName } from './metadata.utils';
import { PackageJson } from 'type-fest';

const SIGNAL_MODULE_SPECIFIERS: ReadonlySet<string> = new Set(['@xaendar/core/signals']);

interface SignalImportBindings {
  named: Set<string>;
  namespaces: Set<string>;
}

/**
 * Statically resolves which class members of a component (including those
 * inherited from a base class — possibly from a pre-compiled library with
 * only `.d.ts` available) are backed by a signal, without any
 * type-checker/`Program`.
 *
 * Walks the `extends` chain: for each ancestor it resolves the module
 * specifier to a concrete file on disk (relative resolution, or
 * `package.json` "types"/"typings"/"exports" lookup for bare specifiers),
 * parses that file, and recurses. `.d.ts` files never carry initializers,
 * so for them only the explicit type-annotation shape
 * (`declare x: Signal<T>` / `accessor x: InputSignal<T>`) is meaningful —
 * which `isSignalMember` already handles.
 *
 * Unresolvable ancestors (missing file, unsupported `exports` map shape,
 * monorepo symlink edge cases, etc.) are skipped silently: this can only
 * ever produce a false negative for THAT ancestor's own members, which
 * degrades to the existing conservative default (treated as reactive),
 * never to an incorrect "not a signal".
 *
 * @param code - Raw TypeScript source of the component file being compiled.
 * @param name - Name of the Class to be compiled
 * @param filePath - Absolute path of that file, needed to resolve relative
 *   imports of its base class.
 * @returns Map of member name → `'signal'`, own members last so they
 *   correctly shadow inherited ones.
 */
export function extractSignalMembers(code: string, name: string, filePath: string): string[] {
  const sourceFile = createSourceFile(filePath, code, ScriptTarget.Latest, true);
  const declarations = getClassAndWebComponentDeclarationsByName(sourceFile, name);
  if (!declarations) {
    return [];
  }

  const classDeclaration = declarations.klass;
  const inherited = resolveInheritedSignalMembers(sourceFile, classDeclaration, dirname(filePath), new Set([resolvePath(filePath)]));
  const ownBindings = collectSignalImportBindings(sourceFile);
  const own = extractOwnSignalMembers(classDeclaration, ownBindings);

  return [...inherited, ...own]; // own entries override inherited ones with the same key
}

/**
 * Resolves the `extends` clause (if any) to a concrete file, parses it, and
 * recursively merges its own + further-inherited signal members.
 */
function resolveInheritedSignalMembers(sourceFile: SourceFile, classDecl: ClassDeclaration, containingDir: string, visited: Set<string>): string[] {
  const baseName = getBaseClassName(classDecl);
  if (!baseName) {
    return [];
  }

  const importDecl = findImportDeclarationFor(sourceFile, baseName);
  // TODO: locally-declared base class in the same file — not handled here, falls back to conservative default
  if (!importDecl || !isStringLiteralLike(importDecl.moduleSpecifier)) {
    return [];
  }

  const declarationFile = resolveDeclarationFile(importDecl.moduleSpecifier.text, containingDir);
  if (!declarationFile || visited.has(declarationFile)) {
    return [];
  }
  visited.add(declarationFile);

  let dtsSource: string;
  try {
    dtsSource = readFileSync(declarationFile, 'utf-8');
  } catch {
    return [];
  }

  const dtsSourceFile = createSourceFile(declarationFile, dtsSource, ScriptTarget.Latest, true);
  const baseClassDecl = findExportedClassDeclaration(dtsSourceFile, baseName);
  if (!baseClassDecl) {
    return [];
  }

  const baseBindings = collectSignalImportBindings(dtsSourceFile);
  const ownOfBase = extractOwnSignalMembers(baseClassDecl, baseBindings);
  const furtherInherited = resolveInheritedSignalMembers(dtsSourceFile, baseClassDecl, dirname(declarationFile), visited);

  return [...furtherInherited, ...ownOfBase];
}

function getBaseClassName(classDecl: ClassDeclaration): string | undefined {
  const heritageClauses = classDecl.heritageClauses;
  if (!heritageClauses) {
    return;
  }

  for (let i = 0; i < heritageClauses.length; i++) {
    const clause = heritageClauses[i];
    if (clause.token === SyntaxKind.ExtendsKeyword) {
      const expr = clause.types[0].expression;
      if (isIdentifier(expr)) {
        return expr.text;
      }
    }
  }

  return;
}

function findImportDeclarationFor(sourceFile: SourceFile, baseClassName: string): ImportDeclaration | undefined {
  let i = 0;
  let found: ImportDeclaration | undefined;
  const statements = sourceFile.statements;

  while (i < statements.length && !found) {
    const node = statements[i];
    if (isImportDeclaration(node)) {
      const namedBindings = node.importClause?.namedBindings;
      if (namedBindings && isNamedImports(namedBindings) ? namedBindings.elements.find(el => el.name.text === baseClassName) : node.importClause?.name?.text === baseClassName) {
        found = node;
      }
    }

    i++;
  }

  return found;
}

function resolveDeclarationFile(specifier: string, containingDir: string): string | undefined {
  if (specifier.startsWith('.') || isAbsolute(specifier)) {
    const base = resolvePath(containingDir, specifier);
    return firstExisting([`${base}.d.ts`, join(base, 'index.d.ts')]);
  }

  const packageRoot = findPackageRoot(specifier, containingDir);
  if (!packageRoot) {
    return undefined;
  }

  let pkgJson: PackageJson;
  try {
    pkgJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8'));
  } catch {
    return undefined;
  }

  const typesField = pkgJson.types ?? pkgJson.typings;
  if (typesField) {
    const resolved = firstExisting([join(packageRoot, typesField)]);
    if (resolved) return resolved;
  }

  const rootExport = selectRootExport(pkgJson.exports);
  const typesPath = rootExport !== undefined ? resolveTypesFromExports(rootExport) : undefined;
  if (typesPath) {
    const resolved = firstExisting([join(packageRoot, typesPath)]);
    if (resolved) return resolved;
  }

  return firstExisting([join(packageRoot, 'index.d.ts')]);
}

function firstExisting(paths: string[]): string | undefined {
  return paths.find(existsSync);
}

function findPackageRoot(specifier: string, containingDir: string): string | undefined {
  let dir = containingDir;
  let found: string | undefined;

  while (!found && dir) {
    const candidate = join(dir, 'node_modules', specifier);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(dir);
    dir = parent === dir ? '' : parent
  }

  return found;
}

/**
 * Selects the entry that governs the package root (`"."` subpath).
 * `exports` may either be a subpath map (keys starting with `.`) containing
 * a `"."` entry, or — when there are no subpaths at all — the root target
 * itself (a string, a conditions object, or a fallback array).
 */
function selectRootExport(exportsField: PackageJson.Exports | undefined): PackageJson.Exports | undefined {
  if (exportsField === null || exportsField === undefined) {
    return undefined;
  }

  if (typeof exportsField === 'string' || Array.isArray(exportsField)) {
    return exportsField;
  }

  // It's an ExportConditions-shaped object: does it look like a subpath map?
  const keys = Object.keys(exportsField);
  const isSubpathMap = keys.length && keys.every(key => key.startsWith('.'));
  return isSubpathMap ? exportsField['.'] : exportsField;
}

/**
 * Recursively searches an `Exports` value for a `"types"` condition,
 * at any nesting depth, trying array fallbacks in order.
 */
function resolveTypesFromExports(exports: PackageJson.Exports): string | undefined {
  // a bare string target carries no explicit "types" condition
  if (exports === null || exports === undefined || typeof exports === 'string') {
    return undefined;
  }

  if (Array.isArray(exports)) {
    for (const entry of exports) {
      const resolved = resolveTypesFromExports(entry);
      if (resolved) {
        return resolved;
      }
    }
    return undefined;
  }

  // ExportConditions object
  if (typeof exports.types === 'string') {
    return exports.types;
  }

  // "types" itself can be a nested conditions object, or the condition we
  // want might be nested under another condition (import/require/default/...)
  for (const value of Object.values(exports)) {
    const resolved = resolveTypesFromExports(value);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

/** Finds a class declaration exported (named or default) with the given name in a `.d.ts` file. */
function findExportedClassDeclaration(sourceFile: SourceFile, name: string): ClassDeclaration | undefined {
  let found: ClassDeclaration | undefined;
  forEachChild(sourceFile, node => {
    if (!found && isClassDeclaration(node) && node.name?.text === name) {
      found = node;
    }
  });
  return found;
}

function collectSignalImportBindings(sourceFile: SourceFile): SignalImportBindings {
  const named = new Set<string>();
  const namespaces = new Set<string>();

  forEachChild(sourceFile, node => {
    if (!isImportDeclaration(node) || !isStringLiteralLike(node.moduleSpecifier)) {
      return;
    }

    if (!SIGNAL_MODULE_SPECIFIERS.has(node.moduleSpecifier.text)) {
      return;
    }

    const namedBindings = node.importClause?.namedBindings;
    if (!namedBindings) {
      return
    }

    if (isNamespaceImport(namedBindings)) {
      namespaces.add(namedBindings.name.text);
    } else {
      for (const element of namedBindings.elements) {
        named.add(element.name.text);
      }
    }
  });

  return { named, namespaces };
}

function extractOwnSignalMembers(classDecl: ClassLikeDeclaration, bindings: SignalImportBindings): string[] {
  const result = new Array<string>();
  for (const member of classDecl.members) {
    if (isPropertyDeclaration(member) && isIdentifier(member.name) && isSignalMember(member, bindings)) {
      result.push(member.name.text, 'signal');
    }
  }
  return result;
}

function isSignalMember(member: PropertyDeclaration, bindings: SignalImportBindings): boolean {
  // Handle initialization by function: input, computed, etc...
  if (member.initializer && isCallExpression(member.initializer)) {
    return resolvesToSignalBinding(member.initializer.expression, bindings);
  }

  /*
    Handle specific case introduced by @Property decorator where
    there is no initialization but only a type reference
  */
  if (member.type && isTypeReferenceNode(member.type)) {
    return resolvesEntityNameToSignalBinding(member.type.typeName, bindings);
  }

  return false;
}

function resolvesToSignalBinding(expr: Expression, bindings: SignalImportBindings): boolean {
  /*
    import { signal } from '@xaendar/core/signals';

    class Foo {
      x = signal(false);
    }
  */
  if (isIdentifier(expr)) {
    return bindings.named.has(expr.text);
  }

  /*
    import * as signals from '@xaendar/core/signals';

    class Foo {
      x = signals.signal(false);
      y = signals.computed(() => ...);
    }
  */
  if (isPropertyAccessExpression(expr) && isIdentifier(expr.expression)) {
    return bindings.namespaces.has(expr.expression.text);
  }

  return false;
}

function resolvesEntityNameToSignalBinding(entityName: EntityName, bindings: SignalImportBindings): boolean {
  /*
    import { InputSignal } from '@xaendar/core/signals';

    class Foo {
      @Property(false)
      accessor x!: InputSignal<boolean>
    }
  */
  if (isIdentifier(entityName)) {
    return bindings.named.has(entityName.text);
  }

  /*
    import * as signals from '@xaendar/core/signals';

    class Foo {
      @Property(false)
      accessor x!: signals.InputSignal<boolean>
    }
  */
  if (isQualifiedName(entityName) && isIdentifier(entityName.left)) {
    return bindings.namespaces.has(entityName.left.text);
  }
  
  return false;
}