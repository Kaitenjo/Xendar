import { CompilerContext } from '../../generator/models/compiler-context.model';
import { ComponentMetadata } from '../../types/component-metadata.type';
import { ComponentOrDirectiveMetadata } from '../../types/component-or-directive-metadata.type';

/**
 * Type checker context that manages imported component and directive metadata
 * for the compilation process. Extends the base CompilerContext to provide
 * import-specific functionality.
 */
export class TypeCheckContext extends CompilerContext {
  /**
   * Array of component and directive imports to be tracked during type checking.
   * Stores metadata extracted from @WebComponent and @Directive decorators.
   */
  private readonly _imports = new Array<ComponentOrDirectiveMetadata>;

  /**
   * Adds a new component or directive import to the type checker context.
   *
   * @param value - The component or directive import metadata to be added
   */
  public addImport(value: ComponentOrDirectiveMetadata): void {
    this._imports.push(value);
  }

  /**
   * Retrieves all registered component and directive imports.
   *
   * @returns Array of all tracked imports
   */
  public getImportBySelector(tagName: string): ComponentMetadata | undefined {
    return this._imports.find((importValue): importValue is ComponentMetadata => importValue.type === 'component' && importValue.selectors.includes(tagName));
  }
}