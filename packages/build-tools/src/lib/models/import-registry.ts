/**
 * Tracks which parent component files (`.xd.component.ts`) import which
 * child component files, so that deleting a child can invalidate the
 * parents that reference it.
 *
 * Mirrors the shape of `template-registry`, but keyed on imported
 * component paths rather than template paths, and supports multiple
 * parents per child (a component can be imported by several templates).
 */
const importToParents = new Map<string, Set<string>>();
const parentToImports = new Map<string, Set<string>>();

/**
 * Registers that `parentId` imports the component at `importedPath`.
 *
 * @param importedPath - Absolute path of the imported `.xd.component.ts` file.
 * @param parentId - Absolute path of the parent component file that imports it.
 */
export function registerImportMapping(importedPath: string, parentId: string): void {
  const importedPathSet = importToParents.getOrInsert(importedPath, new Set())
  importedPathSet.add(parentId);

  const importedParentToImportsSet = parentToImports.getOrInsert(parentId, new Set())
  importedParentToImportsSet.add(importedPath);
}

/**
 * Returns the set of parent ids that currently import the given path.
 *
 * @param importedPath - Absolute path of the imported component file.
 */
export function findParentsForImport(importedPath: string): Set<string> {
  return importToParents.get(importedPath) ?? new Set();
}

/**
 * Clears all import mappings previously registered for `parentId`.
 *
 * Must be called before re-registering a parent's imports on each
 * transform, since a template's `@import` list may change between edits
 * and stale entries would otherwise leak.
 *
 * @param parentId - Absolute path of the parent component file.
 */
export function clearImportsForParent(parentId: string): void {
  const previousImports = parentToImports.get(parentId);
  if (previousImports) {
    for (const importedPath of previousImports) {
      const parents = importToParents.get(importedPath);
      if (parents) {
        parents.delete(parentId);
        if (!parents.size) {
          importToParents.delete(importedPath);
        }
      }
    }
  }
  parentToImports.delete(parentId);
}

/**
 * Resets the entire import registry. Called on dev server shutdown.
 */
export function clearImportRegistry(): void {
  importToParents.clear();
  parentToImports.clear();
}