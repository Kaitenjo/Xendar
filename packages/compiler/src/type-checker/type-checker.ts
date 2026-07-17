import { indent } from "@xaendar/common";
import { CompilerContext } from "../generator/models/compiler-context.model.js";
import { skipGeneration } from "../generator/states/skip-generation.state.js";
import { GeneratorTransitionFunctionReturnType } from "../generator/types/generator-transition-function-return-type.type.js";
import { ROOT_NODE } from "../generator/utils/generator.utils.js";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { ForNode } from "../parser/types/nodes/for-node.type.js";
import { SwitchNode } from "../parser/types/nodes/switch-node.type.js";
import { typeCheckElement } from "./states/type-check-element.state.js";
import { typeCheckFor } from "./states/type-check-for.state.js";
import { typeCheckIf } from "./states/type-check-if.state.js";
import { typeCheckSwitch } from "./states/type-check-switch.state.js";
import { typeCheckTextAndInterpolation } from "./states/type-check-text-and-interpolation.state.js";
import { TypeCheckerStates } from "./types/type-checker-states.type.js";
import { TypeCheckerTransitionFunctionReturnType } from "./types/type-checker-transition-function-return-type.type.js";

export class TypeChecker {
  private readonly _nodeToProcess: Required<TypeCheckerTransitionFunctionReturnType>['functionsToProcess'] = new Map();

  private readonly _states: TypeCheckerStates = {
    [ASTNodeType.Text]: typeCheckTextAndInterpolation,
    [ASTNodeType.Interpolation]: typeCheckTextAndInterpolation,
    [ASTNodeType.Element]: typeCheckElement,
    [ASTNodeType.If]: typeCheckIf,
    [ASTNodeType.For]: typeCheckFor,
    [ASTNodeType.Switch]: typeCheckSwitch,
    [ASTNodeType.Import]: skipGeneration as any
  }

  constructor(
    private _ast: ASTNode[],
  ) { }

  public generate(className: string): string {
    this._nodeToProcess.clear();

    const context = new CompilerContext();
    const generatedCode = [
      `let ${ROOT_NODE}!: ${className};`,
      '',
      'function typeCheck() {',
    ]
    
    for (let i = 0; i < this._ast.length; i++) {
      const result = this._processNode(this._ast[i]!, { identifier: ROOT_NODE, type: className }, i.toString(), context);
      if (result) {
        const { code, functionsToProcess } = result;
        functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
        generatedCode.push(...indent(code));
      }
    }

    generatedCode.push('}')

    for (const [key, fnData] of this._nodeToProcess.entries()) {
      const { node, parentNode, precode, context } = fnData.fn;

      generatedCode.push(
        `\nfunction ${key} (${fnData.args?.join(', ') ?? ''}) {`,
      );

      if (precode) {
        generatedCode.push(indent(precode));
      }

      generatedCode.push(
        ...indent([
          ...node.children.map((child, i) => {
            const result = this._processNode(child, parentNode, i.toString(), context);
            if (result) {
              const { code, functionsToProcess } = result;
              functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
              return code;
            }

            return '';
          }).flat(),
        ]),
        '}'
      );
    }

    return generatedCode.join("\n");
  }

  private _processNode(node: ASTNode, parentNode: { identifier: string, type: string }, index: string, context: CompilerContext): TypeCheckerTransitionFunctionReturnType | undefined {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`[Parser] No transition function for token type ${ASTNodeType[node.type]}`);
    }

    return state(node as never, parentNode, index, context);
  }
}

function generateSwitch(node: SwitchNode, identifier: string, parentNode: string): GeneratorTransitionFunctionReturnType | undefined {
  return {
    code: []
  }
}


function generateFor(node: ForNode, identifier: string, parentNode: string): GeneratorTransitionFunctionReturnType | undefined {
  return {
    code: []
  }
}
