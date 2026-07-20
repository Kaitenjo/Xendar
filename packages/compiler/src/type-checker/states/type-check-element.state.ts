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
      throw new Error(`[Type Checker] ${node.tagName} selector is not associated to any WebComponent imported in the template`);
    }

    lines.push(...typeCheckComponentBindings(node, metadata, context));
  } else {
    node.attributes.forEach(({ value }) => {
      if (typeof value !== 'string') {
        lines.push(`${resolveExpression(value.expression, context, { resolver: 'root' })};`);
      }
    });

    node.events.forEach(({ handler, parameters }) => {
      const eventContext = new CompilerContext([], context);
      eventContext.addUnresolvableIdentifier('$event');

      const args = parameters
        .map(parameter => resolveExpression(parameter, eventContext, { resolver: 'root' }))
        .join(', ');

      lines.push(`root.${handler}(${args});`);
    });
  }

  node.children.forEach(child => lines.push(...processNode(child, context)));

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
 *
 * ⚠️ Assumptions I couldn't verify against your actual types — please
 * confirm/adjust:
 * - `node.events` entries carry a `name` field (the template-facing event
 *   name used to look up `@Event` metadata), the same way attributes carry
 *   `name`. The snippets I've seen only destructured `handler`/`parameters`
 *   for events, never `name` — if the field is called something else,
 *   swap it in `findEvent`'s call site below.
 * - Literal string attribute values (`value` is a plain `string`, no
 *   `{ expression }`) are only checked for NAME existence, not type — I
 *   don't validate e.g. `collapsed="true"` against a `boolean` property,
 *   since I don't know whether your DSL treats un-bound string attributes
 *   as always-string or allows some literal coercion syntax. Flagging
 *   rather than guessing.
 * - `property.type`/`event.detailType` are text that must resolve as a
 *   standalone type expression in the shim's scope (e.g. `'NavItem[]'`
 *   requires `NavItem` to be importable there too, not just the component
 *   class). If your shim only imports the component class today, custom
 *   exported types referenced by `type`/`detailType` will fail to resolve
 *   as "cannot find name" — unrelated to the actual binding being right or
 *   wrong. Worth double-checking against a component that has a non-
 *   primitive `@Property` type, like `NavItem[]` in your own example.
 */
function typeCheckComponentBindings(node: ElementNode, metadata: TypeCheckContextComponentImport, context: TypeCheckContext): string[] {
  const lines = new Array<string>();

  node.attributes.forEach(({ name, value }) => {
    const property = findProperty(metadata, name);
    if (!property) {
      throw new Error(`[Type Checker] Unknown property "${name}" on <${node.tagName}> (${metadata.className} has no @Property with this name or alias).`);
    }

    if (typeof value === 'string') {
      return;
    }

    const expression = resolveExpression(value.expression, context, { resolver: 'root' });
    lines.push(property.type ? `(${expression}) satisfies ${property.type};` : `${expression};`);
  });

  node.events.forEach(({ name, handler, parameters }) => {
    const event = findEvent(metadata, name);
    if (!event) {
      throw new Error(`[Type Checker] Unknown event "${name}" on <${node.tagName}> (${metadata.className} has no @Event with this name).`);
    }

    const eventContext = new CompilerContext([], context);
    eventContext.addUnresolvableIdentifier('$event');

    const args = parameters
      .map(parameter => resolveExpression(parameter, eventContext, { resolver: 'root' }))
      .join(', ');

    // Scoped in its own block so sibling elements' `$event` (each typed
    // differently, per event) never collide in the flat shim function.
    lines.push('{');
    lines.push(`  let $event!: ${event.detailType ?? 'unknown'};`);
    lines.push(`  root.${handler}(${args});`);
    lines.push('}');
  });

  return lines;
}

function findProperty(metadata: TypeCheckContextComponentImport, externalName: string): ComponentPropertyMetadata | undefined {
  return metadata.properties.find(property => (property.alias ?? property.name) === externalName);
}

function findEvent(metadata: TypeCheckContextComponentImport, externalName: string): ComponentEventMetadata | undefined {
  return metadata.events.find(event => event.name === externalName);
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