import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createSourceFile, Decorator, Expression, forEachChild, getNameOfDeclaration, isAccessor, isArrayLiteralExpression, isCallExpression, isClassDeclaration, isIdentifier, isObjectLiteralExpression, isPropertyAccessExpression, isPropertyAssignment, isStringLiteral, ModifierLike, PropertyAssignment, ScriptTarget, SyntaxKind } from 'typescript';
import { ComponentEventMetadata, ComponentPropertyMetadata, TypeCheckContextComponentImport } from '../types/type-checker-context-imports/type-check-context-component-import.type';

/**
 * Extracts component metadata from a source file by parsing decorators.
 * 
 * @param modulePath - The import module path (e.g., './button.component')
 * @param symbolName - The exported symbol name to look for
 * @param baseDir - The directory context for resolving relative paths
 * @returns Component metadata if found, undefined otherwise
 */
export async function extractComponentMetadata(modulePath: string, symbolName: string, baseDir = process.cwd()): Promise<TypeCheckContextComponentImport | undefined> {
  try {
    const filePath = resolveModulePath(modulePath, baseDir);
    if (!filePath) {
      return undefined;
    }

    const source = await readFile(filePath, 'utf8');
    const sourceFile = createSourceFile(filePath, source, ScriptTarget.Latest, true);

    let componentMetadata: TypeCheckContextComponentImport | undefined;

    forEachChild(sourceFile, node => {
      if (componentMetadata) {
        return;
      }

      if (isClassDeclaration(node)) {
        const className = node.name?.text;
        if (className !== symbolName) {
          return;
        }

        // Check for @WebComponent decorator in modifiers
        const modifiers = node.modifiers ?? [];
        const webComponentDecorator = Array.from(modifiers).find(member => isWebComponentDecorator(member));
        if (!webComponentDecorator) {
          return;
        };

        // Extract selectors from decorator
        const selectors = extractSelectorsFromDecorator(webComponentDecorator);
        if (!selectors?.length) {
          return;
        }

        // Extract properties and events
        const properties = new Array<ComponentPropertyMetadata>();
        const events = new Array<ComponentEventMetadata>();

        node.members.forEach(member => {
          if (!isAccessor(member)) {
            return;
          }

          // Look for decorators in modifiers (TypeScript stores them there)
          const memberModifiers = member.modifiers ?? [];
          
          const propDecorator = Array.from(memberModifiers).find(member => isPropertyDecorator(member));
          if (propDecorator) {
            const nameNode = getNameOfDeclaration(member);
            const propName = nameNode && isIdentifier(nameNode) ? nameNode.text : undefined;
            if (propName) {
              const metadata = extractPropertyMetadata(propName, propDecorator);
              if (metadata) {
                properties.push(metadata);
              }
            }
            return;
          }

          const eventDecorator = Array.from(memberModifiers).find(member => isEventDecorator(member));
          if (eventDecorator) {
            const nameNode = getNameOfDeclaration(member);
            const eventName = nameNode && isIdentifier(nameNode) ? nameNode.text : undefined;
            if (eventName) {
              const metadata = extractEventMetadata(eventName, eventDecorator);
              if (metadata) {
                events.push(metadata);
              }
            }
          }
        });

        componentMetadata = {
          type: 'component',
          className,
          selectors,
          properties,
          events,
        };
      }
    });

    return componentMetadata;
  } catch (error) {
    console.error(`Failed to extract component metadata from ${modulePath}:`, error);
    return undefined;
  }
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
 * Checks if a modifier is a @WebComponent decorator.
 */
function isWebComponentDecorator(modifier: ModifierLike): modifier is Decorator {
  if (modifier.kind !== SyntaxKind.Decorator) {
    return false;
  }

  const expr = isCallExpression(modifier.expression) ? modifier.expression.expression : modifier.expression;
  return isIdentifier(expr) && expr.text === 'WebComponent'
}

/**
 * Checks if a modifier is a @Property decorator.
 */
function isPropertyDecorator(modifier: ModifierLike): modifier is Decorator {
  if (modifier.kind !== SyntaxKind.Decorator) {
    return false;
  }

  const expr = modifier.expression;
  if (isCallExpression(expr)) {
    return isIdentifier(expr.expression) && expr.expression.text === 'Property';
  }

  if (isPropertyAccessExpression(expr)) {
    return isIdentifier(expr.expression) && expr.expression.text === 'Property' && isIdentifier(expr.name) && expr.name.text === 'required'
  }

  return isIdentifier(expr) && expr.text === 'Property';
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
function extractPropertyMetadata(propName: string, modifier: Decorator): ComponentPropertyMetadata | undefined {
  const metadata: ComponentPropertyMetadata = {
    name: propName,
    required: false,
  };

  // modifier is a Decorator node, modifier.expression contains the decorator's expression
  const expr = modifier.expression;
  
  // Check if it's @Property.required()
  if (isPropertyAccessExpression(expr)) {
    if (isIdentifier(expr.name) && expr.name.text === 'required') {
      metadata.required = true;
    }
  }

  // Try to extract alias from decorator options
  if (isCallExpression(expr)) {
    const args = expr.arguments;
    if (args.length) {
      const arg = args[0]!;
      if (isObjectLiteralExpression(arg)) {
         const aliasNode = arg.properties?.find((prop): prop is PropertyAssignment => isPropertyAssignment(prop) && isIdentifier(prop.name) && prop.name.text === 'alias')
         if (aliasNode && isStringLiteral(aliasNode.initializer)) {
           metadata.alias = aliasNode.initializer.text;
         } 
      }
    }
  }

  return metadata;
}

/**
 * Extracts event metadata from @Event decorator.
 */
function extractEventMetadata(eventName: string, modifier: Decorator): ComponentEventMetadata | undefined {
  const metadata: ComponentEventMetadata = {
    name: eventName,
  };
  return metadata;
}
