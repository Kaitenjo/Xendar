// states/type-check-element.state.ts
import { CompilerContext } from '../../generator/models/compiler-context.model';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { Line } from '../types/generated-line.type';
import { TypeCheckContextComponentImport } from '../types/type-checker-context-imports/type-check-context-component-import.type';
import { ProcessNode } from '../types/type-checker-process-node.type';
import { indentLines, line, mapped, plain } from '../utils/line-builder.utils';

export function typeCheckElement(node: ElementNode, processNode: ProcessNode, context: TypeCheckContext): Line[] {
  const lines = new Array<Line>();

  if (isCustomElementTag(node.tagName)) {
    const metadata = context.getImportBySelector(node.tagName);
    if (!metadata) {
      throw new Error(`${node.tagName} selector is not associated to any WebComponent imported in the template`, { cause: node.span });
    }

    lines.push(...typeCheckComponentBindings(node, metadata, context));
  } else {
    lines.push(...typeCheckNativeBindings(node, context));
  }

  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    lines.push(...processNode(children[i], context))
  }

  return lines;
}

function typeCheckComponentBindings(node: ElementNode, metadata: TypeCheckContextComponentImport, context: TypeCheckContext): Line[] {
  const lines = new Array<Line>();
  const requiredProperties = new Set(metadata.properties.entries().filter(([_, value]) => value.required).map(([key]) => key));

  const attributes = node.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const { name, value } = attributes[i];
    const property = metadata.properties.get(name);
    if (property) {
      requiredProperties.delete(name);
      lines.push(
        plain('{'),
        ...indentLines(typeof value === 'object'
          ? [line('(', mapped(resolveExpression(value.expression, context, { resolver: 'root' }), value.span), `) satisfies ${property.type};`)]
          : [plain('let x!: string;'), line(mapped(`x satisfies ${property.type};`, attributes[i].span))]
        ),
        plain('}')
      );
    }
  }

  if (requiredProperties.size) {
    throw new Error(`${node.tagName} is missing the following required properties:\n ● ${Array.from(requiredProperties.values()).join(`\n ● `)}`, { cause: node.span });
  }

  const events = node.events;
  for (let i = 0; i < events.length; i++) {
    const { name, handler, parameters } = events[i];
    const event = metadata.events.get(name)
    if (!event) {
      throw new Error(`Unknown event "${name}" on <${node.tagName}> (${metadata.className} has no @Event with this name).`, { cause: node.span });
    }

    const eventContext = new CompilerContext([], context);
    eventContext.addUnresolvableIdentifier('$event');

    const args = parameters
      .map(parameter => resolveExpression(parameter, eventContext, { resolver: 'root' }))
      .join(', ');

    lines.push(plain('{'));

    if (event.type !== 'void') {
      lines.push(...indentLines([plain(`let $event!: CustomEvent<${event.type}>;`)]));
    }

    // NOTA: mappiamo l'intera chiamata sullo span del binding evento
    // (`events[i].span`, l'intero `(click)="handler($event)"`), non sui
    // singoli parametri — se in futuro serve granularità sul singolo
    // argomento, servirebbe uno span per parametro dal parser.
    lines.push(...indentLines([line(mapped(`root.${handler}(${args});`, events[i].span))]));
    lines.push(plain('}'));
  };

  return lines;
}

function typeCheckNativeBindings(node: ElementNode, context: TypeCheckContext): Line[] {
  const lines = new Array<Line>();

  const attributes = node.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const { value } = attributes[i];
    if (typeof value !== 'string') {
      lines.push(line(mapped(`${resolveExpression(value.expression, context, { resolver: 'root' })};`, value.span)));
    }
  };

  const events = node.events;
  for (let i = 0; i < events.length; i++) {
    const { handler, parameters } = events[i];
    const eventContext = new CompilerContext([], context);
    eventContext.addUnresolvableIdentifier('$event');

    const args = parameters
      .map(parameter => resolveExpression(parameter, eventContext, { resolver: 'root' }))
      .join(', ');

    lines.push(line(mapped(`root.${handler}(${args});`, events[i].span)));
  };

  return lines;
}

export function isCustomElementTag(tagName: string): boolean {
  return /^[a-z][a-z0-9._\-]*-[a-z0-9._\-]*$/.test(tagName);
}