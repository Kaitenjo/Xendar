import { indent, slice } from "@xaendar/common";
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
import { ROOT_NODE } from "./utils/generator.utils.js";
import { Span } from "../types/span.type.js";


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
    private _input: string,
    private _ast: ASTNode[],
  ) { }

  public generate(cssVariableName: string | undefined, signals: string[]): string {
    const processFunctions = (functionsToProcess: GeneratorTransitionFunctionReturnType['functionsToProcess']) => {
      if (functionsToProcess) {
        for (const [key, value] of functionsToProcess.entries()) {
          this._nodeToProcess.set(key, value)
        }
      }
    };

    try {
      this._nodeToProcess.clear();
      const compilerContext = new CompilerContext();
      for (let i = 0; i < signals.length; i++) {
        compilerContext.addUnresolvableIdentifier(signals[i], 'signal');
      }

      const generatedCode = [
        '_render() {',
        ...indent([
          `const ${ROOT_NODE} = this._root;`,
          'const context = new Context(this, { createElement: document.createElement.bind(document), get: () => undefined });'
        ])
      ]

      if (cssVariableName) {
        generatedCode.push(indent(`${ROOT_NODE}.adoptedStyleSheets = [${cssVariableName}];`));
      }

      for (let i = 0; i < this._ast.length; i++) {
        const result = this._processNode(this._ast[i], ROOT_NODE, i.toString(), compilerContext, null);
        if (result) {
          const { code, functionsToProcess } = result;
          processFunctions(functionsToProcess);
          generatedCode.push(...indent(code));
        }
      }

      generatedCode.push(
        ...indent(['return context;']),
        '}'
      )

      for (const [key, fnData] of this._nodeToProcess.entries()) {
        const { node, parentNode, context, precode, anchor } = fnData.fn;

        generatedCode.push(
          `\n${key}(${fnData.args?.join(', ')}) {`,
          ...indent(['const context = new Context(this, parentContext);'])
        );

        if (precode) {
          generatedCode.push(indent(precode));
        }

        generatedCode.push(
          ...indent([
            ...node.children.map((child, i) => {
              const result = this._processNode(child, parentNode, i.toString(), context, anchor ?? null);
              if (result) {
                const { code, functionsToProcess } = result;
                processFunctions(functionsToProcess);
                return code;
              }

              return '';
            }).flat(),
            fnData.fn.isForBody ? 'return { context, update };' : 'return context;'
          ]),
          '}'
        );
      }

      return generatedCode.join("\n");
    } catch (err) {
      const error = err as Error;
      const { start, end } = error.cause as Span;
      throw new Error(`[Generator] ${error.message}\n----> ${slice(this._input, start, end)}`);
    }
  }

  private _processNode(node: ASTNode, parentNode: string, index: string, compilerContext: CompilerContext, anchor: string | null): GeneratorTransitionFunctionReturnType | undefined {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`No transition function for ASTNode of type ${ASTNodeType[node.type]}`, { cause: node.span });
    }

    return state(node as never, parentNode, index, compilerContext, anchor);
  }
}