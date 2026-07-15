import { indent } from '@xaendar/common';
import { ASTNodeType } from '../../parser/types/node.enum';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { CompilerContext } from '../models/compiler-context.model';
import { GeneratorTransitionFunctionReturnType } from '../types/generator-transition-function-return-type.type';
import { getBlockIdentifier, resolveExpression } from '../utils/render-generator.utils';

export function generateIf(node: IfNode, parentNode: string, index: string, compilerContext: CompilerContext): GeneratorTransitionFunctionReturnType {
  const ifContext = new CompilerContext([], compilerContext);
  const retVal: GeneratorTransitionFunctionReturnType = {
    code: [],
    functionsToProcess: new Map()
  };

  // La chiamata a _if(...) stessa non riceve né passa alcun anchor esterno:
  // l'anchor del costrutto if viene creato internamente da _if/createAnchor.
  retVal.code.push(`_if(${parentNode}, context, [`);
  const ifKey = getBlockIdentifier('if', parentNode, index);
  retVal.code.push(
    ...indent([
      '{',
      ...indent([`condition: () => ${resolveExpression(node.conditionNode, compilerContext).toString()},`, `block: this.${ifKey}.bind(this)`]),
      '},'
    ])
  );
  // Branch = callback di _if → riceve `anchor` come parametro e lo inoltra ai propri figli diretti.
  retVal.functionsToProcess!.set(ifKey, {
    fn: { node, parentNode: ifKey, context: ifContext, anchor: 'anchor' },
    args: [ifKey, 'parentContext', 'anchor']
  });

  let alt = node.alternate;
  let i = 0;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfContext = new CompilerContext([], compilerContext);
    const keyElseIf = getBlockIdentifier('elseIf', parentNode, `${index}_${i}`);
    const conditionNode = alt.conditionNode;

    retVal.code.push(
      ...indent([
        '{',
        ...indent([`condition: () => ${resolveExpression(conditionNode, compilerContext).toString()},`, `block: this.${keyElseIf}.bind(this)`]),
        '},'
      ])
    );

    // Anche l'else-if è un branch: stesso trattamento dell'if.
    retVal.functionsToProcess!.set(keyElseIf, {
      fn: { node: alt, parentNode, context: elseIfContext, anchor: 'anchor' },
      args: [parentNode, 'parentContext', 'anchor']
    });
    alt = alt.alternate;
    i++;
  }

  if (alt) {
    const elseContext = new CompilerContext([], compilerContext);
    const keyElse = getBlockIdentifier('else', parentNode, index);
    retVal.code.push(
      ...indent([
        '{',
        ...indent([`block: this.${keyElse}.bind(this)`]),
        '},'
      ])
    );
    // Idem per l'else.
    retVal.functionsToProcess!.set(keyElse, {
      fn: { node: alt, parentNode, context: elseContext, anchor: 'anchor' },
      args: [parentNode, 'parentContext', 'anchor']
    });
  }

  retVal.code.push(']);');
  return retVal
}