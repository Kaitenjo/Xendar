/**
 * Represents a component property with metadata from @Property decorator.
 */
export type ComponentPropertyMetadata = {
  /**
   * Property name in the component class.
   */
  name: string;

  /**
   * Whether the property is required to be set.
   */
  required: boolean;

  /**
   * Optional alias for attribute binding (if specified in decorator options).
   */
  alias?: string;

  /**
   * TypeScript type of the property (e.g., 'string', 'number', 'boolean').
   */
  type?: string;
};

/**
 * Represents a component event with metadata from @Event decorator.
 */
export type ComponentEventMetadata = {
  /**
   * Event name as it appears in templates.
   */
  name: string;

  /**
   * Detail type emitted by the event.
   */
  detailType?: string;
};

/**
 * Import type for component declarations in type-checker context.
 * Stores metadata extracted from @WebComponent decorated classes.
 */
export type TypeCheckContextComponentImport = {
  /**
   * The import type identifier.
   */
  type: 'component';

  /**
   * Component class name.
   */
  className: string;

  /**
   * HTML element selectors (tag names).
   */
  selectors: string[];

  /**
   * Component input properties metadata.
   */
  properties: ComponentPropertyMetadata[];

  /**
   * Component output events metadata.
   */
  events: ComponentEventMetadata[];
};
