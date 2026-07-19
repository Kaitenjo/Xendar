import { indent } from '@xaendar/common';
import { CompilerContext } from '../../generator/models/compiler-context.model';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { ASTNodeType } from '../../parser/types/node.enum';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks an `@if`/`@else if`/`@else` chain using real TypeScript
 * `if` / `else if` / `else` blocks.
 *
 * This is a genuine correctness improvement over the previous
 * sibling-functions approach, not just a simplification: a real
 * `if`/`else if` chain gives the TS compiler's control-flow analysis the
 * negated narrowing of every preceding condition for free (e.g. inside an
 * `else if`, TS already knows the first condition was false) — something
 * flat sibling functions could never express.
 */
export function typeCheckIf(node: IfNode, context: CompilerContext, index: string, processNode: ProcessNode): string[] {
  const lines: string[] = [];

  const condition = resolveExpression(node.conditionNode, context, { resolver: 'root' });
  const ifContext = new CompilerContext([], context);

  lines.push(`if (${condition}) {`);
  lines.push(...indent(node.children.flatMap((child, i) => processNode(child, ifContext, i.toString()))));
  lines.push('}');

  let alt = node.alternate;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfCondition = resolveExpression(alt.conditionNode, context, { resolver: 'root' });
    const elseIfContext = new CompilerContext([], context);

    lines.push(`else if (${elseIfCondition}) {`);
    lines.push(...indent(alt.children.flatMap((child, i) => processNode(child, elseIfContext, i.toString()))));
    lines.push('}');

    alt = alt.alternate;
  }

  if (alt) {
    const elseContext = new CompilerContext([], context);
    lines.push('else {');
    lines.push(...indent(alt.children.flatMap((child, i) => processNode(child, elseContext, i.toString()))));
    lines.push('}');
  }

  return lines;
}