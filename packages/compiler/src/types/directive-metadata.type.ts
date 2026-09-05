import { ComponentMetadata } from "./component-metadata.type";

/**
 * Metadata type for directive declarations, derived from component metadata by omitting component-specific properties.
 */
export type DirectiveMetadata = Omit<ComponentMetadata, 'type' | 'styleUrls' | 'templateUrl'> & {
  /**
   * The type identifier for directive metadata.
   */
  type: 'directive'
};