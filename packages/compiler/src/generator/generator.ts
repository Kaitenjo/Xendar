import { indent } from "@xaendar/common";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { CompilerContext } from "./models/compiler-context.model.js";
import { processElement } from "./states/process-element.state.js";
import { processFor } from "./states/process-for.state.js";
import { processIf } from "./states/process-if.state.js";
import { processSwitch } from "./states/process-switch.state.js";
import { processTextAndInterpolation } from "./states/process-text-and-interpolation.state.js";
import { GeneratorStates } from "./types/generator-states.type.js";
import { GeneratorTransitionFunctionReturnType } from "./types/generator-transition-function-return-type.type.js";
import { getElementIdentifier, ROOT_NODE } from "./utils/render-generator.utils.js";


export class Generator {
  private readonly _nodeToProcess: Required<GeneratorTransitionFunctionReturnType>['functionsToProcess'] = new Map();

  /**
   * Mapping of token types to their corresponding parser transition functions, 
   * which handle the logic for parsing each token type into AST nodes.
   */
  private readonly _states: GeneratorStates = {
    [ASTNodeType.Text]: processTextAndInterpolation,
    [ASTNodeType.Interpolation]: processTextAndInterpolation,
    [ASTNodeType.Element]: processElement,
    [ASTNodeType.If]: processIf,
    [ASTNodeType.For]: processFor,
    [ASTNodeType.Switch]: processSwitch
  }

  /*
  * @param ast - Top-level AST nodes produced by the Parser.
  * @param cssVariableName - Optional name of the CSS variable to inject into
  *   the generated `adoptedStyleSheets` assignment.
  */
  constructor(
    private _ast: ASTNode[],
    private _cssVariableName?: string
  ) { }

  /**
   * Generates the TypeScript body of a render function from an AST.
   * @returns A string containing the render function body.
   */
  public generate(): string {
    this._nodeToProcess.clear();
    const compilerContext = new CompilerContext();

    const renderFunctions = [
      '_render() {',
      ...indent([
        `const ${ROOT_NODE} = this._root;`,
        'const context = new Context(this);'
      ])
    ]

    if (this._cssVariableName) {
      renderFunctions.push(indent(`${ROOT_NODE}.adoptedStyleSheets = [${this._cssVariableName}];`));
    }

    for (let i = 0; i < this._ast.length; i++) {
      const { code, functionsToProcess } = this._processNode(this._ast[i]!, ROOT_NODE, i.toString(), compilerContext);
      functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
      renderFunctions.push(...indent(code));
    }

    renderFunctions.push(
      ...indent(['return context;']),
      '}'
    )

    for (const [key, fnData] of this._nodeToProcess.entries()) {
      const { node, parentNode, context } = fnData.fn
      renderFunctions.push(
        `\n${key}(${fnData.args?.join(', ')}) {`,
        ...indent([
          'const context = new Context(this, parentContext);',
          ...node.children.map((child, i) => {
            const { code, functionsToProcess } = this._processNode(child, parentNode, i.toString(), context);
            functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
            return code;
          }).flat(),
          'return context'
        ]),
        '}'
      );
    }

    return renderFunctions.join("\n");
  }

  /**
   * Generates code that appends `nodeName` to `parentNode`.
   * For flow control nodes no single var is produced; instead multiple children
   * are appended directly inside the control flow block.
   */
  private _processNode(node: ASTNode, parentNode: string, index: string, compilerContext: CompilerContext): GeneratorTransitionFunctionReturnType {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`[Parser] No transition function for token type ${ASTNodeType[node.type]}`);
    }

    return state(node as never, parentNode, index, compilerContext);
  }
}

