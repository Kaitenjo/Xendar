import { slice } from '@xaendar/common';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createSourceFile, DeclarationName, Decorator, Expression, getNameOfDeclaration, isArrayLiteralExpression, isCallExpression, isDecorator, isIdentifier, isObjectLiteralExpression, isPropertyAccessExpression, isPropertyAssignment, isPropertyDeclaration, isStringLiteral, isTypeReferenceNode, ModifierLike, PropertyAssignment, ScriptTarget, SyntaxKind, TypeNode } from 'typescript';
import { getClassAndWebComponentDeclarationsByName } from '../../utils/metadata.utils';
import { ComponentEventMetadata, ComponentPropertyMetadata, ComponentPropertyMetadataWishSpan, TypeCheckContextComponentImport } from '../types/type-checker-context-imports/type-check-context-component-import.type';

/**
 * Extracts component metadata from a source file by parsing decorators.
 * 
 * @param modulePath - The import module path (e.g., './button.component')
 * @param className - The exported symbol name to look for
 * @param baseDir - The directory context for resolving relative paths
 * @returns Component metadata if found, undefined otherwise
 */
export async function extractComponentMetadata(modulePath: string, className: string, baseDir = process.cwd()): Promise<TypeCheckContextComponentImport | undefined> {
  const filePath = resolveModulePath(modulePath, baseDir);
  if (!filePath) {
    return undefined;
  }

  const source = await readFile(filePath, 'utf8');
  const sourceFile = createSourceFile(filePath, source, ScriptTarget.Latest, true);

  let componentMetadata: TypeCheckContextComponentImport | undefined;
  let i = 0;

  const declarations = getClassAndWebComponentDeclarationsByName(sourceFile, className);
  if (!declarations) {
    return;
  }

  const { klass, decorator } = declarations;

  // Extract selectors from decorator
  const selectors = extractSelectorsFromDecorator(decorator);
  if (!selectors?.length) {
    return;
  }

  // Extract properties and events
  const properties = new Map<string, ComponentPropertyMetadataWishSpan>();
  const events = new Map<string, ComponentEventMetadata>();
  const members = klass.members;

  for (let j = 0; j < members.length; j++) {
    const member = members[j];
    if (!isPropertyDeclaration(member)) {
      continue;
    }

    // Look for decorators in modifiers (TypeScript stores them there)
    const memberModifiers = member.modifiers ?? [];

    let required = false;
    const propDecorator = Array.from(memberModifiers).find((member): member is Decorator => {
      const result = isPropertyDecorator(member);
      required = !!result.required;
      return result.decorator
    });

    if (propDecorator) {
      const nameNode = getNameOfDeclaration(member);
      if (nameNode && isIdentifier(nameNode)) {
        const propName = nameNode.text;
        const metadata = extractPropertyMetadata(nameNode, propName, propDecorator, required);
        if (metadata) {
          const actualPropName = metadata.alias ?? propName;
          const conflictingProperty = properties.get(actualPropName);
          if (!conflictingProperty) {
            properties.set(actualPropName, metadata);
          } else {
            const { start, end } = conflictingProperty.span;
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
            throw `Failed to extract metadata from an imported component in the template - ${filePath}\n[Ln ${line + 1}, Col ${character + 1}] - A property identified by name ${actualPropName} was already defined\n ---> ${slice(source, start - character, end)}`;
          }
        }
      }
      continue;
    }

    const eventDecorator = Array.from(memberModifiers).find(member => isEventDecorator(member));
    if (eventDecorator) {
      const nameNode = getNameOfDeclaration(member);
      const eventName = nameNode && isIdentifier(nameNode) ? nameNode.text : undefined;
      if (eventName) {
        const metadata = extractEventMetadata(eventDecorator);
        if (metadata) {
          events.set(eventName, metadata);
        }
      }
    }
  }

  const mappedProperties = new Map<string, ComponentPropertyMetadata>();
  properties.entries().forEach(([propName, metadata]) => mappedProperties.set(propName, {
    name: metadata.name,
    required: metadata.required,
    type: metadata.type,
    alias: metadata.alias
  }));

  componentMetadata = {
    type: 'component',
    className,
    selectors,
    properties: mappedProperties,
    events,
  };

  return componentMetadata;
}

/**
 * Resolves a module import path to an actual file system path.
 * Handles both relative paths (./button.component) and package paths (@scope/pkg).
 * 
 * @param modulePath - The import module path
 * @param baseDir - The directory to resolve relative imports from
 * @returns The resolved file path, or undefined if not found
 */
function resolveModulePath(modulePath: string, baseDir: string): string | undefined {
  // Handle relative imports
  if (modulePath.startsWith('.')) {
    const resolvedPath = resolve(baseDir, modulePath);

    // Try with .ts extension
    if (existsSync(`${resolvedPath}.ts`)) {
      return resolvedPath + '.ts';
    }

    // Try with /index.ts if directory
    if (existsSync(`${resolvedPath}/index.ts`)) {
      return `${resolvedPath}/index.ts`;
    }

    // Try as-is (might already have extension)
    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  // TODO: Handle package imports and tsconfig aliases
  return undefined;
}

/**
 * Checks if a modifier is a @Property decorator.
 */
function isPropertyDecorator(modifier: ModifierLike): { decorator: boolean, required?: true } {
  if (!isDecorator(modifier)) {
    return {
      decorator: false
    }
  }

  const expr = modifier.expression;
  if (!isCallExpression(expr)) {
    return {
      decorator: false
    }
  }

  const subExpr = expr.expression

  // @Property(...
  if (isIdentifier(subExpr) && subExpr.text === 'Property') {
    return {
      decorator: true,
    }
  }

  // @Property.required(...
  if (isPropertyAccessExpression(subExpr) && isIdentifier(subExpr.expression) && subExpr.expression.text === 'Property' && subExpr.name.text === 'required') {
    return {
      decorator: true,
      required: true
    }
  }

  return {
    decorator: false
  }
}

/**
 * Checks if a modifier is an @Event decorator.
 */
function isEventDecorator(modifier: ModifierLike): modifier is Decorator {
  if (modifier.kind !== SyntaxKind.Decorator) {
    return false;
  }

  const expr = isCallExpression(modifier.expression) ? modifier.expression.expression : modifier.expression;
  return isIdentifier(expr) && expr.text === 'Event';
}

/**
 * Extracts selector(s) from @WebComponent decorator arguments.
 * 
 * @example
 * @WebComponent({ selector: 'my-button' })
 * @WebComponent({ selector: ['my-btn', 'button-el'] })
 */
function extractSelectorsFromDecorator(modifier: Decorator): string[] {
  try {
    // modifier is a Decorator node, modifier.expression contains the decorator's call expression
    const expr = modifier.expression;
    if (!isCallExpression(expr)) {
      return [];
    }

    const args = expr.arguments;
    if (args.length === 0) {
      return [];
    }

    const arg = args[0];

    // Expect an object literal: { selector: '...' } or { selector: [...] }
    if (!arg || !isObjectLiteralExpression(arg)) {
      return [];
    }

    const prop = Array.from(arg.properties).find((prop): prop is PropertyAssignment => isPropertyAssignment(prop) && isIdentifier(prop.name) && prop.name.text === 'selector')!;
    return extractStringOrStringArray(prop.initializer);
  } catch {
    return [];
  }
}

/**
 * Extracts a string or string array value from a TypeScript node.
 */
function extractStringOrStringArray(node: Expression): string[] {
  if (isStringLiteral(node)) {
    return [node.text];
  }

  return isArrayLiteralExpression(node) ? node.elements?.filter(node => isStringLiteral(node)).map(node => node.text) : [];
}

/**
 * Extracts property metadata from @Property or @Property.required decorator.
 */
function extractPropertyMetadata(nameNode: DeclarationName, name: string, modifier: Decorator, required: boolean): ComponentPropertyMetadataWishSpan | undefined {
  // modifier is a Decorator node, modifier.expression contains the decorator's expression
  const expr = modifier.expression;
  const metadata: ComponentPropertyMetadataWishSpan = {
    name,
    required,
    type: isPropertyDeclaration(modifier.parent) ? extractGenericArgument(modifier.parent.type) : 'any',
    span: {
      /*
        In case of duplicate @Property names (alias and propName or alias and alias)
        We need to store the span where the propName is present, if an alias is declared
        these values will be overwritten
      */
      start: nameNode.getStart(),
      end: nameNode.getEnd()
    }
  };

  // Extract Alias
  if (isCallExpression(expr)) {
    const args = expr.arguments;
    const decoratorParameters = args.length ? args.find(arg => isObjectLiteralExpression(arg))! : undefined
    const aliasNode = decoratorParameters?.properties?.find((prop): prop is PropertyAssignment => isPropertyAssignment(prop) && isIdentifier(prop.name) && prop.name.text === 'alias')
    if (aliasNode && isStringLiteral(aliasNode.initializer)) {
      const initializer = aliasNode.initializer;
      metadata.alias = initializer.text;
      metadata.span = {
        start: initializer.getStart(),
        end: initializer.getEnd()
      }
    }
  }

  return metadata;
}

/**
 * Extracts event metadata from @Event decorator.
 */
function extractEventMetadata(modifier: Decorator): ComponentEventMetadata | undefined {
  const metadata: ComponentEventMetadata = {
    type: 'void'
  };

  // Extract Type
  if (isPropertyDeclaration(modifier.parent)) {
    metadata.type = extractGenericArgument(modifier.parent.type, true);
  }

  return metadata;
}

/**
 * Given a TypeNode like Output<boolean>, returns "boolean".
 * If there's no generic argument, returns "void".
 */
function extractGenericArgument(typeNode: TypeNode | undefined, event = false): string {
  const defaultValue = event ? 'void' : 'any';

  /*
    If no type has been provided we assume it's 
    - Void for Events
    - any for Properties
  */
  if (!typeNode || !isTypeReferenceNode(typeNode)) {
    return defaultValue;
  }

  // No generics
  const typeArgs = typeNode.typeArguments;
  if (!typeArgs || typeArgs.length === 0) {
    return defaultValue;
  }

  return typeArgs[0].getText();
}