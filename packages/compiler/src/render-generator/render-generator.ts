import { indent } from "@xaendar/common";
import { Function } from "@xaendar/types";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { CompilerContext } from "./models/compiler-context.model.js";
import { processElement } from "./states/process-element.state.js";
import { processFor } from "./states/process-for.state.js";
import { processIf } from "./states/process-if.state.js";
import { processSwitch } from "./states/process-switch.state.js";
import { processTextAndInterpolation } from "./states/process-text-and-interpolation.state.js";
import { getElementIdentifier, ROOT_NODE } from "./utils/render-generator.utils.js";

const nodeToProcess = new Map<string, {
  fn: Function<string[], string[]>,
  args:
  | [parentElement: string, parentContext: string] // If Switch
  | [parentElement: string, parentContext: string, items: string, index: string] // For
}
>();

/**
 * Generates the TypeScript body of a render function from an AST.
 *
 * @param ast - Top-level AST nodes produced by the Parser.
 * @param cssVariableName - Optional name of the CSS variable to inject into
 *   the generated `adoptedStyleSheets` assignment.
 * @returns A string containing the render function body.
 */
export function generateRenderFunction(ast: ASTNode[], cssVariableName?: string): string {
  nodeToProcess.clear();
  const compilerContext = new CompilerContext();

  const renderFunctions = [
    '_render() {',
    ...indent([
      `const ${ROOT_NODE} = this._root;`,
      'const context = new Context(this)'
    ])
  ]

  if (cssVariableName) {
    renderFunctions.push(indent(`${ROOT_NODE}.adoptedStyleSheets = [${cssVariableName}];`));
  }

  renderFunctions.push(
    ...indent([
      ...ast.map((node, i) => [...processNode(node, i.toString(), ROOT_NODE, compilerContext)]).flat(),
      'return context;'
    ]),
    '}'
  )

  while (nodeToProcess.size) {
    const [key, fnData] = nodeToProcess.entries().next().value!;
    renderFunctions.push(
      `${key}(${fnData.args.join(', ')}) {`,
      ...indent([
        'const context = new Context(this, parentContext)',
        ...fnData.fn(...fnData.args),
        'return context'
      ]),
      '}',
    );
    nodeToProcess.delete(key);
  }

  return renderFunctions.join("\n");
}

/**
 * Generates code that appends `nodeName` to `parentNode`.
 * For flow control nodes no single var is produced; instead multiple children
 * are appended directly inside the control flow block.
 */
export function processNode(node: ASTNode, nodeName: string, parentNode: string, compilerContext: CompilerContext): string[] {
  switch (node.type) {
    case ASTNodeType.Text:
    case ASTNodeType.Interpolation:
      return processTextAndInterpolation(node, parentNode, compilerContext);

    case ASTNodeType.Element:
      return processElement(node, getElementIdentifier(node, parentNode, nodeName), parentNode, compilerContext);

    case ASTNodeType.If:
      const conditionalBlockData = processIf(node, nodeName, parentNode, compilerContext);
      conditionalBlockData.fns.forEach((fnBody, key) => nodeToProcess.set(key, { fn: () => fnBody.code, args: fnBody.args }));
      return conditionalBlockData.mainBlock;

    case ASTNodeType.For:
      const forBlockData = processFor(node, nodeName, parentNode, compilerContext);
      forBlockData.fns.forEach((fnBody, key) => nodeToProcess.set(key, { fn: () => fnBody.code, args: fnBody.args }));
      return forBlockData.mainBlock;

    case ASTNodeType.Switch:
      const switchBlockData = processSwitch(node, nodeName, parentNode, compilerContext);
      switchBlockData.fns.forEach((fnBody, key) => nodeToProcess.set(key, { fn: () => fnBody.code, args: fnBody.args }));
      return switchBlockData.mainBlock;

    default:
      return [];
  }
}
