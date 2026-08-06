import { indent } from '@xaendar/common';
import { CompilerContext } from '../../generator/models/compiler-context.model';
import { resolveExpression } from '../../generator/utils/generator.utils';
import { ElementNode } from '../../parser/types/nodes/element-node.type';
import { TypeCheckContext } from '../models/type-checker-context';
import { ComponentEventMetadata, ComponentPropertyMetadata, TypeCheckContextComponentImport } from '../types/type-checker-context-imports/type-check-context-component-import.type';
import { ProcessNode } from '../types/type-checker-process-node.type';

/**
 * Type-checks an element node: its attribute/property bindings, its event
 * handlers, and recursively its children.
 *
 * Two completely different validation paths, depending on the tag:
 *
 * - **Native tags** (`div`, `button`, ...): bindings are just resolved
 *   expressions/handler calls, exactly as before — there's no component
 *   contract to check them against.
 * - **Custom elements** (tag contains a hyphen): every binding is checked
 *   by NAME against the `@Property`/`@Event` metadata extracted from the
 *   imported component class. An unknown name is a hard error (the
 *   template is binding to something the component doesn't expose) — not
 *   a warning, consistent with the "no matching @import" check already in
 *   place for the tag itself.
 *
 * No variable is declared for the element itself (see the module doc on
 * `TypeChecker` for why) — attribute expressions and event calls are
 * emitted as bare statements, validated in place.
 */
export function typeCheckElement(node: ElementNode, processNode: ProcessNode, context: TypeCheckContext): string[] {
  const lines = new Array<string>();

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

/**
 * Validates every attribute/property and event binding on a custom-element
 * node against the `@Property`/`@Event` metadata of the resolved component.
 *
 * Property values are checked with `satisfies` against `property.type` —
 * chosen over a typed `const` so an unused local never shows up if the
 * consuming project has `noUnusedLocals` enabled. Event handlers get a
 * block-scoped `$event` typed from `event.detailType`, wrapped in its own
 * `{ }` block so multiple event bindings on sibling elements never clash
 * on the `$event` name.
 */
function typeCheckComponentBindings(node: ElementNode, metadata: TypeCheckContextComponentImport, context: TypeCheckContext): string[] {
  const lines = new Array<string>();
  const requiredProperties = new Set(metadata.properties.filter(property => property.required).map(property => property.alias ?? property.name));

  const attributes = node.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const { name, value } = attributes[i];
    const property = findProperty(metadata, name);
    if (property) {
      requiredProperties.delete(property.alias ?? property.name);
      lines.push(
        '{',
        ...indent(typeof value === 'object'
          ? [`(${resolveExpression(value.expression, context, { resolver: 'root' })}) satisfies ${property.type};`]
          : ['let x!: string', `x satisfies ${property.type};`]
        ),
        '}'
      );
    }
  }

  if (requiredProperties.size) {
    throw new Error(`${node.tagName} is missing the following required properties: ${Array.from(requiredProperties.values()).join(`\n`)}`, { cause: node.span });
  }

  const events = node.events;
  for (let i = 0; i < events.length; i++) {
    const { name, handler, parameters } = events[i];
    const event = findEvent(metadata, name);
    if (!event) {
      throw new Error(`Unknown event "${name}" on <${node.tagName}> (${metadata.className} has no @Event with this name).`, { cause: node.span });
    }

    const eventContext = new CompilerContext([], context);
    eventContext.addUnresolvableIdentifier('$event');

    const args = parameters
      .map(parameter => resolveExpression(parameter, eventContext, { resolver: 'root' }))
      .join(', ');

    /*
      Scoped in its own block so sibling elements' `$event` (each typed
      differently, per event) never collide in the flat shim function.
    */
    lines.push('{');

    if (event.type !== 'void') {
      lines.push(indent(`let $event!: CustomEvent<${event.type}>;`))
    }

    lines.push(
      indent(`root.${handler}(${args});`),
      '}'
    );
  };

  return lines;
}

/**
 * Looks up a `@Property` entry in `metadata` by its external (template-facing)
 * name, taking `alias` into account: if the property declares an alias, that
 * alias is what the template must use, not the class field name.
 */
function findProperty(metadata: TypeCheckContextComponentImport, externalName: string): ComponentPropertyMetadata | undefined {
  return metadata.properties.find(property => (property.alias ?? property.name) === externalName);
}

/**
 * Looks up an `@Event` entry in `metadata` by its template-facing event name.
 */
function findEvent(metadata: TypeCheckContextComponentImport, externalName: string): ComponentEventMetadata | undefined {
  return metadata.events.find(event => event.name === externalName);
}

/**
 * Resolves attribute/property bindings and event handlers on a native HTML
 * element node (any tag without a hyphen).
 *
 * Bound attribute values (i.e. those carrying an `{ expression }` object
 * rather than a plain string) are emitted as bare expression statements so
 * that the TypeScript compiler validates them in the shim. Static string
 * attributes are skipped — there is nothing to type-check.
 *
 * Event bindings are emitted as `root.<handler>(<args>)` calls. `$event` is
 * registered as an unresolvable identifier in the event's own sub-context so
 * that it is accepted without a declaration being emitted into the shim.
 */
function typeCheckNativeBindings(node: ElementNode, context: TypeCheckContext): string[] {
  const lines = new Array<string>();

  const attributes = node.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const { value } = attributes[i];
    if (typeof value !== 'string') {
      lines.push(`${resolveExpression(value.expression, context, { resolver: 'root' })};`);
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

    lines.push(`root.${handler}(${args});`);
  };

  return lines;
}

/**
 * Returns true if `tagName` has the shape of a custom element (per the
 * Custom Elements spec: contains a hyphen). This is a pure classification
 * check — it does NOT validate whether the name is actually usable as a
 * new custom element (reserved names, etc.); use `isValidCustomElementName`
 * for that, at declaration time.
 */
export function isCustomElementTag(tagName: string): boolean {
  return /^[a-z][a-z0-9._\-]*-[a-z0-9._\-]*$/.test(tagName);
}