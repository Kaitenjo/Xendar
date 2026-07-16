import { indent } from "@xaendar/common";
import { ASTNode } from "../parser/types/ast.type.js";
import { ASTNodeType } from "../parser/types/node.enum.js";
import { ElementNode } from "../parser/types/nodes/element-node.type.js";
import { ForNode } from "../parser/types/nodes/for-node.type.js";
import { IfNode } from "../parser/types/nodes/if-node.type.js";
import { InterpolationNode } from "../parser/types/nodes/interpolation-node.type.js";
import { SwitchNode } from "../parser/types/nodes/switch-node.type.js";
import { TextNode } from "../parser/types/nodes/text-node.type.js";
import { skipGeneration } from "./states/skip-generation.state.js";
import { GeneratorTransitionFunctionReturnType } from "./types/generator-transition-function-return-type.type.js";
import { getElementIdentifier, resolveExpression, ROOT_NODE } from "./utils/render-generator.utils.js";
import { CompilerContext } from "./models/compiler-context.model.js";


export class TypeChecker {
  private readonly _nodeToProcess: Required<GeneratorTransitionFunctionReturnType>['functionsToProcess'] = new Map();

  private readonly _states: any = {
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

  public generate(className: string): string {
    this._nodeToProcess.clear();

    const renderFunctions = new Array<string>
    
    renderFunctions.push(`let root!: ${className};`) 
    for (let i = 0; i < this._ast.length; i++) {
      const result = this._processNode(this._ast[i]!, ROOT_NODE, i.toString());
      if (result) {
        const { code, functionsToProcess } = result;
        functionsToProcess?.forEach((value, key) => this._nodeToProcess.set(key, value));
        renderFunctions.push(...code);
      }
    }

    for (const [key, fnData] of this._nodeToProcess.entries()) {
      const { node, parentNode, precode } = fnData.fn;

      if (precode) {
        renderFunctions.push(indent(precode));
      }

      renderFunctions.push(
        ...indent([
          ...node.children.map((child, i) => {
            const result = this._processNode(child, parentNode, i.toString());
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

  private _processNode(node: ASTNode, parentNode: string, index: string): GeneratorTransitionFunctionReturnType | undefined {
    const state = this._states[node.type];

    if (!state) {
      throw new Error(`[Parser] No transition function for token type ${ASTNodeType[node.type]}`);
    }

    return state(node as never, parentNode, index);
  }
}

function generateTextAndInterpolation(node: TextNode | InterpolationNode, identifier: string, parentNode: string): GeneratorTransitionFunctionReturnType | undefined {
  return {
    code: []
  }
}


function generateElement(node: ElementNode, parentNode: string, index: string): GeneratorTransitionFunctionReturnType | undefined {
  const nodeName = getElementIdentifier(node, parentNode, index);
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  }

  retVal.code.push(`let ${nodeName}!: HTMLElement`);

  node.attributes.forEach(({ name, value }) => {
    const isLiteral = typeof value === 'string';
    retVal.code.push(`${nodeName}.setAttribute('${name}', ${isLiteral ? `'${value}'` : resolveExpression(value.expression, new CompilerContext, { resolver: 'root', skipResolution: false })})`)
  });

  const context = new CompilerContext;
  context.addUnresolvableIdentifier('$event');
  node.events.forEach(({ name, handler, parameters }) => {
    let parsedEventParameter = false;
    const mappedParameters = parameters.map(parameter => {
      const resolvedParameter = resolveExpression(parameter, context, { resolver: 'root', skipResolution: false });
      if (!parsedEventParameter && resolvedParameter === '$event') {
        parsedEventParameter = true;
        return `$event`
      } else {
        return `${resolvedParameter}`
      }
    }).join(', ');
    const beginning = parsedEventParameter ? '($event)' : '()'
    retVal.code.push(`${nodeName}.addEventListener('${name}', ${beginning} => root.${handler}(${mappedParameters}))`)
  });

  return retVal;
}


function generateIf(node: IfNode, identifier: string, parentNode: string): GeneratorTransitionFunctionReturnType | undefined {
  return {
    code: []
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
