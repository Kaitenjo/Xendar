import { resolveExpression } from '../../generator/utils/generator.utils';
import { ASTNodeType } from '../../parser/types/node.enum';
import { IfNode } from '../../parser/types/nodes/if-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { Line } from '../types/generated-line.type';
import { ProcessNode } from '../types/type-checker-process-node.type';
import { indentLines, line, mapped, plain } from '../utils/line-builder.utils';

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
export function typeCheckIf(node: IfNode, processNode: ProcessNode, context: TypeCheckContext): Line[] {
  const lines = new Array<Line>();
  const condition = resolveExpression(node.conditionNode, context, { resolver: 'root' });

  lines.push(line('if (', mapped(condition.expression, node.span), ') {'));
  lines.push(...indentLines(node.children.flatMap(child => processNode(child, context))));
  lines.push(plain('}'));

  let alt = node.alternate;
  while (alt?.type === ASTNodeType.ElseIf) {
    const elseIfCondition = resolveExpression(alt.conditionNode, context, { resolver: 'root' });

    lines.push(line('else if (', mapped(elseIfCondition.expression, alt.span), ') {'));
    lines.push(...indentLines(alt.children.flatMap(child => processNode(child, context))));
    lines.push(plain('}'));

    alt = alt.alternate;
  }

  if (alt) {
    lines.push(plain('else {'));
    lines.push(...indentLines(alt.children.flatMap(child => processNode(child, context))));
    lines.push(plain('}'));
  }

  return lines;
}