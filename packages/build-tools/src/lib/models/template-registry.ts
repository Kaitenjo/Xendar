/**
 * template-registry.ts
 *
 * Module-level singleton that tracks the reverse mapping from a template
 * file's absolute path to the absolute path of the component file that
 * declares it via `templateUrl`. Populated inside the plugin's `transform`
 * hook, the first time a component is processed and its templatePath is
 * resolved — and consulted from `watchChange` when a template file is
 * deleted, so the corresponding type-check shim can be removed even though
 * the component `.ts` file itself is untouched.
 */

/** 
 * templatePath (absolute) -> componentId (absolute path of the .xd.component.ts) 
 */
const templateToComponent = new Map<string, string>();

/**
 * Registers (or updates) the association between a template file and the
 * component that declares it. Safe to call on every `transform` run for a
 * component — it's a plain overwrite, not an increment, so re-registering
 * the same pair is a no-op in practice.
 *
 * @param templatePath - Absolute path of the `.html` template file.
 * @param componentId - Absolute path of the component file that references
 *   it via `templateUrl`.
 */
export function registerTemplateMapping(templatePath: string, componentId: string): void {
  templateToComponent.set(templatePath, componentId);
}

/**
 * Looks up which component declares the given template path.
 *
 * @param templatePath - Absolute path of the `.html` template file.
 * @returns The absolute path of the owning component, or `undefined` if no
 *   component has registered this template path (e.g. it was never
 *   processed, or was already removed).
 */
export function findComponentForTemplate(templatePath: string): string | undefined {
  return templateToComponent.get(templatePath);
}

/**
 * Removes the mapping for a given template path, e.g. once its component
 * has been fully torn down (component file deleted) and the mapping is no
 * longer needed.
 *
 * Note: when only the template is deleted (component `.ts` still exists),
 * you generally do NOT want to call this — see `unregisterTemplateMapping`
 * usage guidance in the module doc comment on `watchChange` in plugin.ts.
 * Removing the mapping here means a later recreation of the template file
 * won't be automatically re-associated until `transform` runs again for
 * the component (which it will, since Vite invalidates the component
 * module too in that scenario).
 *
 * @param templatePath - Absolute path of the `.html` template file to
 *   forget.
 */
export function removeTemplateMapping(templatePath: string): void {
  templateToComponent.delete(templatePath);
}

/**
 * Removes every template mapping that points to the given component,
 * e.g. when the component file itself is deleted. A component could in
 * principle have registered only one template at a time (a component has
 * a single `templateUrl`), but this scans defensively in case of stale
 * entries from a renamed templateUrl.
 *
 * @param componentId - Absolute path of the component file being torn
 *   down.
 */
export function removeAllMappingsForComponent(componentId: string): void {
  for (const [templatePath, ownerId] of templateToComponent) {
    if (ownerId === componentId) {
      templateToComponent.delete(templatePath);
    }
  }
}

/**
 * Clears the entire registry. Intended to be called alongside
 * `disposeLanguageService()` so a dev-server restart doesn't leak stale
 * mappings into a fresh session.
 */
export function clearTemplateRegistry(): void {
  templateToComponent.clear();
}