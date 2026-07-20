import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { 
  createSourceFile, 
  ScriptTarget, 
  forEachChild, 
  isClassDeclaration,
  isCallExpression,
  isIdentifier,
  isAccessor,
  isPropertyAccessExpression,
  getNameOfDeclaration,
  SyntaxKind
} from 'typescript';
import { TypeCheckContextComponentImport, ComponentPropertyMetadata, ComponentEventMetadata } from '../types/type-checker-context-imports/type-check-context-component-import.type';

/**
 * Resolves a module import path to an actual file system path.
 * Handles both relative paths (./button.component) and package paths (@scope/pkg).
 * 
 * @param modulePath - The import module path
 * @param baseDir - The directory to resolve relative imports from
 * @returns The resolved file path, or undefined if not found
 */
async function resolveModulePath(modulePath: string, baseDir: string): Promise<string | undefined> {
  // Handle relative imports
  if (modulePath.startsWith('.')) {
    const resolvedPath = resolve(baseDir, modulePath);
    
    // Try with .ts extension
    if (existsSync(resolvedPath + '.ts')) {
      return resolvedPath + '.ts';
    }
    
    // Try with /index.ts if directory
    if (existsSync(resolvedPath + '/index.ts')) {
      return resolvedPath + '/index.ts';
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
 * Extracts component metadata from a source file by parsing decorators.
 * 
 * @param modulePath - The import module path (e.g., './button.component')
 * @param symbolName - The exported symbol name to look for
 * @param baseDir - The directory context for resolving relative paths
 * @returns Component metadata if found, undefined otherwise
 */
export async function extractComponentMetadata(
  modulePath: string,
  symbolName: string,
  baseDir: string = process.cwd()
): Promise<TypeCheckContextComponentImport | undefined> {
  try {
    const filePath = await resolveModulePath(modulePath, baseDir);
    if (!filePath) {
      return undefined;
    }

    const source = await readFile(filePath, 'utf8');
    const sourceFile = createSourceFile(
      filePath,
      source,
      ScriptTarget.Latest,
      true
    );

    let componentMetadata: TypeCheckContextComponentImport | undefined;

    forEachChild(sourceFile, (node) => {
      if (componentMetadata) return;

      if (isClassDeclaration(node)) {
        const className = node.name?.text;
        if (className !== symbolName) return;

        // Check for @WebComponent decorator in modifiers
        const modifiers = node.modifiers || [];
        const webComponentDecorator = modifiers.find(
          (m: any) => isWebComponentDecorator(m)
        );

        if (!webComponentDecorator) return;

        // Extract selectors from decorator
        const selectors = extractSelectorsFromDecorator(webComponentDecorator);
        if (!selectors || selectors.length === 0) return;

        // Extract properties and events
        const properties = new Array<ComponentPropertyMetadata>();
        const events = new Array<ComponentEventMetadata>();

        node.members.forEach((member) => {
          if (!isAccessor(member)) return;

          // Look for decorators in modifiers (TypeScript stores them there)
          const memberModifiers = member.modifiers || [];
          
          const propDecorator = memberModifiers.find((m: any) => isPropertyDecorator(m));
          if (propDecorator) {
            const nameNode = getNameOfDeclaration(member);
            const propName = nameNode && isIdentifier(nameNode) ? nameNode.text : undefined;
            if (propName) {
              const metadata = extractPropertyMetadata(propName, propDecorator);
              if (metadata) properties.push(metadata);
            }
            return;
          }

          const eventDecorator = memberModifiers.find((m: any) => isEventDecorator(m));
          if (eventDecorator) {
            const nameNode = getNameOfDeclaration(member);
            const eventName = nameNode && isIdentifier(nameNode) ? nameNode.text : undefined;
            if (eventName) {
              const metadata = extractEventMetadata(eventName, eventDecorator);
              if (metadata) events.push(metadata);
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
 * Checks if a modifier is a @WebComponent decorator.
 */
function isWebComponentDecorator(modifier: any): boolean {
  if (modifier.kind !== SyntaxKind.Decorator) return false;
  const expr = modifier.expression;
  if (isCallExpression(expr)) {
    return isIdentifier(expr.expression) && expr.expression.text === 'WebComponent';
  }
  return isIdentifier(expr) && expr.text === 'WebComponent';
}

/**
 * Checks if a modifier is a @Property decorator.
 */
function isPropertyDecorator(modifier: any): boolean {
  if (modifier.kind !== SyntaxKind.Decorator) return false;
  const expr = modifier.expression;
  if (isCallExpression(expr)) {
    return isIdentifier(expr.expression) && expr.expression.text === 'Property';
  }
  if (isPropertyAccessExpression(expr)) {
    return (
      isIdentifier(expr.expression) &&
      expr.expression.text === 'Property' &&
      isIdentifier(expr.name) &&
      expr.name.text === 'required'
    );
  }
  return isIdentifier(expr) && expr.text === 'Property';
}

/**
 * Checks if a modifier is an @Event decorator.
 */
function isEventDecorator(modifier: any): boolean {
  if (modifier.kind !== SyntaxKind.Decorator) return false;
  const expr = modifier.expression;
  if (isCallExpression(expr)) {
    return isIdentifier(expr.expression) && expr.expression.text === 'Event';
  }
  return isIdentifier(expr) && expr.text === 'Event';
}

/**
 * Extracts selector(s) from @WebComponent decorator arguments.
 * 
 * @example
 * @WebComponent({ selector: 'my-button' })
 * @WebComponent({ selector: ['my-btn', 'button-el'] })
 */
function extractSelectorsFromDecorator(modifier: any): string[] {
  try {
    // modifier is a Decorator node, modifier.expression contains the decorator's call expression
    const expr = modifier.expression;
    if (!isCallExpression(expr)) {
      return [];
    }

    const args = expr.arguments;
    if (args.length === 0) return [];

    const arg = args[0] as any;
    // Expect an object literal: { selector: '...' } or { selector: [...] }
    if (!arg || arg.kind !== SyntaxKind.ObjectLiteralExpression) {
      return [];
    }

    let selectors: string[] = [];
    arg.properties?.forEach((prop: any) => {
      if (prop.name?.text === 'selector') {
        if (prop.initializer) {
          const value = extractStringOrStringArray(prop.initializer);
          if (value) {
            selectors = Array.isArray(value) ? value : [value];
          }
        }
      }
    });

    return selectors;
  } catch {
    return [];
  }
}

/**
 * Extracts a string or string array value from a TypeScript node.
 */
function extractStringOrStringArray(node: any): string | string[] | undefined {
  // String literal: 'my-button'
  if (node.kind === SyntaxKind.StringLiteral) {
    return node.text;
  }

  // Array literal: ['btn-1', 'btn-2']
  if (node.kind === SyntaxKind.ArrayLiteralExpression) {
    const strings: string[] = [];
    node.elements?.forEach((elem: any) => {
      if (elem.kind === SyntaxKind.StringLiteral) {
        strings.push(elem.text);
      }
    });
    return strings.length > 0 ? strings : undefined;
  }

  return undefined;
}

/**
 * Extracts property metadata from @Property or @Property.required decorator.
 */
function extractPropertyMetadata(propName: string, modifier: any): ComponentPropertyMetadata | undefined {
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
    if (args.length > 0) {
      const arg = args[0] as any;
      // Could be PropertyDecoratorOptions object
      if (arg.kind === SyntaxKind.ObjectLiteralExpression) {
        arg.properties?.forEach((prop: any) => {
          if (prop.name?.text === 'alias' && prop.initializer?.kind === SyntaxKind.StringLiteral) {
            metadata.alias = prop.initializer.text;
          }
        });
      }
    }
  }

  return metadata;
}

/**
 * Extracts event metadata from @Event decorator.
 */
function extractEventMetadata(eventName: string, modifier: any): ComponentEventMetadata | undefined {
  const metadata: ComponentEventMetadata = {
    name: eventName,
  };

  // modifier is a Decorator node with modifier.expression as the decorator expression
  // TODO: Extract event options and detail type from decorator
  // For now, just return the name

  return metadata;
}
