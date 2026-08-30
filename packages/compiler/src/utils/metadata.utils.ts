import { ClassDeclaration, Decorator, getDecorators, isCallExpression, isClassDeclaration, isIdentifier, isPropertyAccessExpression, SourceFile } from "typescript";

/**
 * Finds a class declaration by name and returns it only when it is decorated as a Xaendar web component.
 *
 * @param sourceFile - TypeScript source file that contains the class declarations to inspect.
 * @param name - Class name to match.
 * @returns The matching class declaration and its `WebComponent` decorator, or `undefined` when no decorated class is found.
 */
export function getClassAndWebComponentDeclarationsByName(sourceFile: SourceFile, name: string): { klass: ClassDeclaration, decorator: Decorator }  | undefined {
  let i = 0;
  let found: { klass: ClassDeclaration, decorator: Decorator } | undefined;
  const statements = sourceFile.statements;

  while (i < statements.length && !found) {
    const node = statements[i];
    if (isClassDeclaration(node) && node.name?.text === name) {
      const decorator = hasWebComponentDecorator(node);
      if (decorator) {
         found = { klass: node, decorator }
      }
    }
    
    i++;
  }

  return found; 
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