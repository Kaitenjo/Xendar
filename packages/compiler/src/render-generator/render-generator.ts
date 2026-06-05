import { indent } from "@xaendar/common";
import { NoArgsFunction, Function } from "@xaendar/types";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { Context } from "./models/render-context.model.js";
import { processConstDeclaration } from "./states/process-const-declaration.state.js";
import { processElement } from "./states/process-element.state.js";
import { processFor } from "./states/process-for.state.js";
import { processIf } from "./states/process-if.state.js";
import { processSwitch } from "./states/process-switch.state.js";
import { processTextAndInterpolation } from "./states/process-text-and-interpolation.state.js";
import { getElementIdentifier, getTextIdentifier, ROOT_NODE } from "./utils/render-generator.utils.js";

const nodeToProcess = new Map<string, { fn: NoArgsFunction<string[]> } | { fn: Function<[items: string, index: string], string[]>, args: [items: string, index: string] }>();

/**
 * Generates the TypeScript body of a render function from an AST.
 *
 * @param ast Top-level AST nodes produced by the Parser
 * @returns String containing the render function body
 */
export function generateRenderFunction(ast: ASTNode[], cssVariableName?: string): string {
  nodeToProcess.clear();
  const context = new Context;

  const renderFunctions = [
    '_render() {',
  ]

  if (cssVariableName) {
    renderFunctions.push(`  this._root.adoptedStyleSheets = [${cssVariableName}];`);
  }
  
  renderFunctions.push(
    '  let unwatchFns = [];',
    ...indent(...ast.map((node, i) => [...processNode(node, i.toString(), ROOT_NODE, context)]).flat()),
    '  return unwatchFns;',
    '}'
  )

  while (nodeToProcess.size > 0) {
    const [key, fnData] = nodeToProcess.entries().next().value!;
    if ('args' in fnData) {      
      renderFunctions.push(
        `${key}(${fnData.args.join(', ')}) {`,
        '  let unwatchFns = [];',
        ...indent(...fnData.fn(...fnData.args)),
        '  return unwatchFns;',
        '}',
      );
    } else {
      renderFunctions.push(
        `${key}() {`,
        '  let unwatchFns = [];',
        ...indent(...fnData.fn()),
        '  return unwatchFns;',
        '}',
      );
    }
    nodeToProcess.delete(key);
  }

  return renderFunctions.join("\n");
}

/**
 * Generates code that appends `nodeName` to `parentNode`.
 * For flow control nodes no single var is produced; instead multiple children
 * are appended directly inside the control flow block.
 */
export function processNode(node: ASTNode, nodeName: string, parentNode: string, context: Context): string[] {
  switch (node.type) {
    case ASTNodeType.Text:
    case ASTNodeType.Interpolation:
      return processTextAndInterpolation(node, getTextIdentifier(parentNode, nodeName), parentNode, context);

    case ASTNodeType.Element:
      return processElement(node, getElementIdentifier(node, parentNode, nodeName), parentNode, context);

    case ASTNodeType.If:
      const conditionalBlockData = processIf(node, nodeName, parentNode, context);
      conditionalBlockData.fns.forEach((fnBody, key) => nodeToProcess.set(key, { fn: () => fnBody }));
      return conditionalBlockData.mainBlock;

    case ASTNodeType.For:
      const forBlockData = processFor(node, nodeName, parentNode, context);
      forBlockData.fns.forEach((fnBody, key) => nodeToProcess.set(key, { fn: () => fnBody.code, args: fnBody.args }));
      return forBlockData.mainBlock;

    case ASTNodeType.Switch:
      const switchBlockData = processSwitch(node, nodeName, parentNode, context);
      switchBlockData.fns.forEach((fnBody, key) => nodeToProcess.set(key, { fn: () => fnBody }));
      return switchBlockData.mainBlock;

    case ASTNodeType.ConstDeclaration:
      return processConstDeclaration(node, nodeName, parentNode, context);

    default:
      return [];
  }
}
