import { ComponentMetadata } from './component-metadata.type';
import { DirectiveMetadata } from './directive-metadata.type';

/**
 * Union type of context import types for type-checker.
 * 
 * Stores metadata for components and directives extracted from decorators.
 * Regular symbol imports (values, functions, etc.) are NOT stored here;
 * they're made available directly in the generated type-check scope via
 * typed variable declarations.
 */
export type ComponentOrDirectiveMetadata =
  | ComponentMetadata
  | DirectiveMetadata;
