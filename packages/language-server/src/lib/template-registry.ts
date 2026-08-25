import { readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { resolve } from 'node:path';
import { extractClassName, extractDecoratorPaths } from '@xaendar/language-core';

// TODO: Instead of extracting the class name from the related .ts file on each
// compilation, read the file and use a regular expression on its contents.
// Load it lazily on the first compilation and reuse it instead of recalculating it.

/**
 * Bidirectional template <-> component index for the entire workspace.
 * Replaces on-demand scanning: built once at startup and kept up to date
 * by the client's file watchers, so templates and classes can live in
 * arbitrarily different paths without guessing where to look on each lookup.
 */
const templateToComponent = new Map<string, Map<string, string[]>>();
const componentToTemplate = new Map<string, string>();

/**
 * Scans all `*.xd.component.ts` files in the workspace folders,
 * reads their decorator to extract `templateUrl`, and populates the index.
 * Should be called once at server startup (in `onInitialized`).
 *
 * @param workspaceRoots - Absolute paths of the workspace roots, from
 *   `connection.workspace.getWorkspaceFolders()`.
 */
export async function buildComponentIndex(workspaceRoots: string[]): Promise<void> {
  for (let i = 0; i < workspaceRoots.length; i++) {
    const componentFiles = await fg('**/*.xd.component.ts', {
      cwd: workspaceRoots[i],
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    for (let j = 0; j < componentFiles.length; j++) {
      indexComponent(componentFiles[j]);
    }
  }
}

/**
 * Reads (or re-reads) the decorator of a single component file and
 * updates the index. Should be called when a `.ts` file is created or
 * modified, because its `templateUrl` may have changed.
 */
export function indexComponent(componentPath: string): void {
  try {
    const source = readFileSync(componentPath, 'utf-8');
    const { templatePath } = extractDecoratorPaths(source, componentPath.replace(/[^/\\]+$/, ''));
    if (!templatePath) {
      return;
    }

    const className = extractClassName(source);
    const resolvedTemplate = resolve(templatePath);
    const associatedComponentsPaths = templateToComponent.get(resolvedTemplate) ?? new Map;
    const associatedComponentsAtPaths = associatedComponentsPaths.get(componentPath);
    associatedComponentsAtPaths ? associatedComponentsAtPaths.push(className) : associatedComponentsPaths.set(componentPath, [className]);
    templateToComponent.set(resolvedTemplate, associatedComponentsPaths);
    componentToTemplate.set(componentPath, resolvedTemplate);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Removes a component from the index when its `.ts` file is deleted.
 *
 * @param componentPath - Absolute path to the deleted component file.
 */
export function removeComponentFromIndex(componentPath: string): void {
  const templatePath = componentToTemplate.get(componentPath);
  if (templatePath) {
    templateToComponent.delete(templatePath);
  }
  componentToTemplate.delete(componentPath);
}

/**
 * Resolves the component associated with a template in constant time.
 *
 * @param templatePath - Path to the template file.
 * @returns The associated component path, or `undefined` when it is not indexed.
 */
export function resolveComponentForTemplate(templatePath: string): ReturnType<(typeof templateToComponent['get'])> {
  const path = resolve(templatePath);
  return templateToComponent.get(path);
}