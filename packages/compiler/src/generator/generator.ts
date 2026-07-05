import { indent } from "@xaendar/common";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { CompilerContext } from "./models/compiler-context.model.js";
import { generateElement } from "./states/generate-element.state.js";
import { generateFor } from "./states/generate-for.state.js";
import { generateIf } from "./states/generate-if.state.js";
import { generateSwitch } from "./states/generate-switch.state.js";
import { generateTextAndInterpolation } from "./states/generate-text-and-interpolation.state.js";
import { GeneratorStates } from "./types/generator-states.type.js";
import { GeneratorTransitionFunctionReturnType } from "./types/generator-transition-function-return-type.type.js";
import { getElementIdentifier, ROOT_NODE } from "./utils/render-generator.utils.js";


export class Generator {
  private readonly _nodeToProcess: Required<GeneratorTransitionFunctionReturnType>['functionsToProcess'] = new Map();

  private readonly _states: GeneratorStates = {
    [ASTNodeType.Text]: generateTextAndInterpolation,
    [ASTNodeType.Interpolation]: generateTextAndInterpolation,
    [ASTNodeType.Element]: generateElement,
    [ASTNodeType.If]: generateIf,
    [ASTNodeType.For]: generateFor,
    [ASTNodeType.Switch]: generateSwitch
  }

  constructor(
    private _ast: ASTNode[],
    private _cssVariableName?: string
  ) { }

  public generate(): string {
    this._nodeToProcess.clear();
    const compilerContext = new CompilerContext();

    const renderFunctions = [
      '_render() {',
      ...indent([
        `const ${ROOT_NODE} = this._root;`,
        'const context = new Context(this);',
        'const namespace = undefined;'
      ])
    ]

    if (this._cssVariableName) {
      renderFunctions.push(indent(`${ROOT_NODE}.adoptedStyleSheets = [${this._cssVariableName}];`));
    }

    // Livello top di render(): nessun anchor disponibile, non siamo dentro
    // nessun branch di if/for/switch.
    for (let i = 0; i < this._ast.length; i++) {
      const { code, functionsToProcess } = this._processNode(this._ast[i]!, ROOT_NODE, i.toString(), compilerContext, null);
      functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
      renderFunctions.push(...indent(code));
    }

    renderFunctions.push(
      ...indent(['return context;']),
      '}'
    )

    for (const [key, fnData] of this._nodeToProcess.entries()) {
      const { node, parentNode, context, precode, anchor } = fnData.fn;

      renderFunctions.push(
        `\n${key}(${fnData.args?.join(', ')}) {`,
        ...indent([
          'const context = new Context(this, parentContext, namespace);',
          ...node.children.map((child, i) => {
            const { code, functionsToProcess } = this._processNode(child, parentNode, i.toString(), context, anchor ?? null);
            functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
            if (precode) {
              code.unshift(precode);
            }
            return code;
          }).flat(),
          fnData.fn.isForBody ? 'return { context, update };' : 'return context;'
        ]),
        '}'
      );
    }

    return renderFunctions.join("\n");
  }

  private _processNode(node: ASTNode, parentNode: string, index: string, compilerContext: CompilerContext, anchor: string | null): GeneratorTransitionFunctionReturnType {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`[Parser] No transition function for token type ${ASTNodeType[node.type]}`);
    }

    return state(node as never, parentNode, index, compilerContext, anchor);
  }
}