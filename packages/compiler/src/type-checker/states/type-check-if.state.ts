import { indent } from '@xaendar/common';
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
export function typeCheckIf(node: IfNode, processNode: ProcessNode): string[] {
  const lines: string[] = [];

  const condition = resolveExpression(node.conditionNode, { resolver: 'root' });

  lines.push(`if (${condition}) {`);
  lines.push(...indent(node.children.flatMap(child => processNode(child))));
  lines.push('}');

  let alt = node.alternate;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfCondition = resolveExpression(alt.conditionNode, { resolver: 'root' });

    lines.push(`else if (${elseIfCondition}) {`);
    lines.push(...indent(alt.children.flatMap(child => processNode(child))));
    lines.push('}');

    alt = alt.alternate;
  }

  if (alt) {
    lines.push('else {');
    lines.push(...indent(alt.children.flatMap(child => processNode(child))));
    lines.push('}');
  }

  return lines;
}