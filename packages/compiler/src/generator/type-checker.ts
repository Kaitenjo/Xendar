import { indent } from "@xaendar/common";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { CompilerContext } from "./models/compiler-context.model.js";
import { generateElement } from "./states/generate-element.state.js";
import { generateFor } from "./states/generate-for.state.js";
import { generateIf } from "./states/generate-if.state.js";
import { generateSwitch } from "./states/generate-switch.state.js";
import { generateTextAndInterpolation } from "./states/generate-text-and-interpolation.state.js";
import { skipGeneration } from "./states/skip-generation.state.js";
import { GeneratorStates } from "./types/generator-states.type.js";
import { GeneratorTransitionFunctionReturnType } from "./types/generator-transition-function-return-type.type.js";
import { ROOT_NODE } from "./utils/render-generator.utils.js";


export class Generator {
  private readonly _nodeToProcess: Required<GeneratorTransitionFunctionReturnType>['functionsToProcess'] = new Map();

  private readonly _states: GeneratorStates = {
    [ASTNodeType.Text]: generateTextAndInterpolation,
    [ASTNodeType.Interpolation]: generateTextAndInterpolation,
    [ASTNodeType.Element]: generateElement,
    [ASTNodeType.If]: generateIf,
    [ASTNodeType.For]: generateFor,
    [ASTNodeType.Switch]: generateSwitch,
    [ASTNodeType.Import]: skipGeneration
  }

  constructor(
    private _ast: ASTNode[],
  ) { }

  public generate(): string {
    this._nodeToProcess.clear();
    const compilerContext = new CompilerContext();

    const renderFunctions = new Array<string>

    for (let i = 0; i < this._ast.length; i++) {
      const result = this._processNode(this._ast[i]!, ROOT_NODE, i.toString(), compilerContext, null);
      if (result) {
        const { code, functionsToProcess } = result;
        functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
        renderFunctions.push(...indent(code));
      }
    }

    for (const [key, fnData] of this._nodeToProcess.entries()) {
      const { node, parentNode, context, precode, anchor } = fnData.fn;

      if (precode) {
        renderFunctions.push(indent(precode));
      }

      renderFunctions.push(
        ...indent([
          ...node.children.map((child, i) => {
            const result = this._processNode(child, parentNode, i.toString(), context, anchor ?? null);
            if (result) {
              const { code, functionsToProcess } = result;
              functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
              return code;
            }

            return '';
          }).flat(),
        ])
      );
    }

    return renderFunctions.join("\n");
  }

  private _processNode(node: ASTNode, parentNode: string, index: string, compilerContext: CompilerContext, anchor: string | null): GeneratorTransitionFunctionReturnType | undefined {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`[Parser] No transition function for token type ${ASTNodeType[node.type]}`);
    }

    return state(node as never, parentNode, index, compilerContext, anchor);
  }
}