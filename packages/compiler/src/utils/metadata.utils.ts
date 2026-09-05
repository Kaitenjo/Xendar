import { slice } from "@xaendar/common";
import { existsSync } from "fs";
import { resolve } from "path";
import { ClassDeclaration, DeclarationName, Decorator, Expression, getDecorators, getNameOfDeclaration, Identifier, isArrayLiteralExpression, isCallExpression, isClassDeclaration, isDecorator, isIdentifier, isObjectLiteralExpression, isPropertyAccessExpression, isPropertyAssignment, isPropertyDeclaration, isStringLiteral, isTypeReferenceNode, ModifierLike, PropertyAssignment, PropertyDeclaration, SourceFile, Statement, SyntaxKind, TypeNode } from "typescript";
import { ClassDeclarationWithName, ComponentDeclaration, ComponentEventMetadata, ComponentMetadata, ComponentPropertyMetadata } from "../types/component-metadata.type";
import { Span } from "../types/span.type";

/**
 * Represents a component property with metadata from @Property decorator.
 */
type ComponentPropertyMetadataWishSpan = ComponentPropertyMetadata & {
  span: Span
};

/**
 * Extracts component metadata from a source file by parsing decorators.
 * By default, it reads the source file and extracts metadata for the specified component class.
 * 
 * 
 * @param modulePath - The import module path (e.g., './button.component')
 * @param className - The exported symbol name to look for
 * @param baseDir - The directory context for resolving relative paths
 * @returns Component metadata if found, undefined otherwise
 */
export async function extractComponentsMetadataFromSourceFile(sourceFile: SourceFile): Promise<Map<string, ComponentMetadata> | undefined> {
  const metadatas = new Map<string, ComponentMetadata>();

  const declarations = getClassAndWebComponentDeclarations(sourceFile);
  for (let i = 0; i < declarations.length; i++) {
    const { klass, decorator } = declarations[i];
    const { selectors, styleUrl, templateUrl } = extractMetadaFromDecorator(decorator);
    if (!selectors?.length || !templateUrl) {
      return;
    }

    // Extract properties and events
    const properties = new Map<string, ComponentPropertyMetadataWishSpan>();
    const events = new Map<string, ComponentEventMetadata>();
    const members = klass.members;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
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
          const metadata = extractPropertyMetadata(member, nameNode, propName, propDecorator, required);
          if (metadata) {
            const actualPropName = metadata.alias ?? propName;
            const conflictingProperty = properties.get(actualPropName);
            if (!conflictingProperty) {
              properties.set(actualPropName, metadata);
            } else {
              const { start, end } = conflictingProperty.span;
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
              const { fileName, text } = sourceFile;
              throw `Failed to extract metadata from an imported component in the template - ${fileName}\n[Ln ${line + 1}, Col ${character + 1}] - A property identified by name ${actualPropName} was already defined\n ---> ${slice(text, start - character, end)}`;
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

    const className = klass.name.text;
    metadatas.set(className, {
      type: 'component',
      className,
      selectors,
      styleUrl,
      templateUrl,
      properties: mappedProperties,
      events,
      typescriptNodes: declarations[i]
    });
  }

  return metadatas;
}

/**
 * Resolves a module import path to an actual file system path.
 * Handles both relative paths (./button.component) and package paths (@scope/pkg).
 * 
 * @param modulePath - The import module path
 * @param baseDir - The directory to resolve relative imports from
 * @returns The resolved file path, or undefined if not found
 */
export function resolveModulePath(modulePath: string, baseDir: string): string | undefined {
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
 * Finds a class declaration by name and returns it only when it is decorated as a Xaendar web component.
 *
 * @param sourceFile - TypeScript source file that contains the class declarations to inspect.
 * @param name - Class name to match.
 * @returns The matching class declaration and its `WebComponent` decorator, or `undefined` when no decorated class is found.
 */
function getClassAndWebComponentDeclarations(sourceFile: SourceFile): ComponentDeclaration[] {
  const found = new Array<ComponentDeclaration>();
  const statements = sourceFile.statements;

  for (let i = 0; i < statements.length; i++) {
    const node = statements[i];
    if (classDeclarationHasName(node)) {
      const decorator = hasWebComponentDecorator(node);
      if (decorator) {
        found.push({ klass: node, decorator });
      }
    }
  }

  return found;
}

function classDeclarationHasName(node: Statement): node is ClassDeclarationWithName {
  return isClassDeclaration(node) && !!node.name?.text;
}

/**
 * Checks whether a class declaration has a `WebComponent` decorator.
 *
 * Supports both direct usage (`@WebComponent(...)`) and namespaced usage (`@xaendar.WebComponent(...)`).
 *
 * @param classDecl - Class declaration whose decorators should be inspected.
 * @returns The matching decorator node, or `undefined` when the class is not a web component.
 */
function hasWebComponentDecorator(classDecl: ClassDeclaration): Decorator | undefined {
  const decorators = getDecorators(classDecl);
  if (!decorators?.length) {
    return undefined;
  }

  let i = 0;
  let found: Decorator | undefined;

  while (i < decorators.length && !found) {
    const decorator = decorators[i];
    if (!isCallExpression(decorator.expression)) {
      i++;
      continue;
    }

    const callee = decorator.expression.expression;
    if (isIdentifier(callee) && callee.text === 'WebComponent') {
      found = decorator;
    }

    // supports a namespaced usage too, e.g. @xaendar.WebComponent(...)
    if (isPropertyAccessExpression(callee) && isIdentifier(callee.name) && callee.name.text === 'WebComponent') {
      found = decorator;
    }

    i++;
  }

  return found;
}

/**
 * Extracts selector(s) from @WebComponent decorator arguments.
 * 
 * @example
 * @WebComponent({ selector: 'my-button' })
 * @WebComponent({ selector: ['my-btn', 'button-el'] })
 */
function extractMetadaFromDecorator(decorator: Decorator): Pick<ComponentMetadata, 'selectors' | 'templateUrl' | 'styleUrl'> {
  const retVal: ReturnType<typeof extractMetadaFromDecorator> = {
    selectors: [],
    templateUrl: '',
    styleUrl: undefined,
  };

  try {
    const expr = decorator.expression;
    if (!isCallExpression(expr)) {
      return retVal
    }

    const args = expr.arguments;
    if (args.length === 0) {
      return retVal;
    }

    const arg = args[0];
    // Expect an object literal: { selector: '...' } or { selector: [...] }
    if (!arg || !isObjectLiteralExpression(arg)) {
      return retVal;
    }

    for (let i = 0; i < arg.properties.length; i++) {
      const prop = arg.properties[i];
      if (isPropertyAssignment(prop) && isIdentifier(prop.name)) {
        switch (prop.name.text) {
          case 'selector':
            retVal.selectors = extractStringOrStringArray(prop.initializer);
            break;
          case 'templateUrl':
            retVal.templateUrl = isStringLiteral(prop.initializer) ? prop.initializer.text : '';
            break;
          case 'styleUrl':
            retVal.styleUrl = isStringLiteral(prop.initializer) ? prop.initializer.text : undefined;
            break;
        }
      }
    }

    return retVal;
  } catch {
    return retVal;
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
 * Extracts property metadata from @Property or @Property.required decorator.
 */
function extractPropertyMetadata(property: PropertyDeclaration, nameNode: Identifier, name: string, decorator: Decorator, required: boolean): ComponentPropertyMetadataWishSpan | undefined {
  // modifier is a Decorator node, modifier.expression contains the decorator's expression
  const expr = decorator.expression;
  const metadata: ComponentPropertyMetadataWishSpan = {
    name,
    required,
    type: extractGenericArgument(property.type),
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
 * Extracts event metadata from @Event decorator.
 */
function extractEventMetadata(decorator: Decorator): ComponentEventMetadata | undefined {
  const metadata: ComponentEventMetadata = {
    type: 'void'
  };

  // Extract Type
  if (isPropertyDeclaration(decorator.parent)) {
    metadata.type = extractGenericArgument(decorator.parent.type, true);
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