import { ComponentOrDirectiveMetadata } from '@xaendar/compiler';

const metadatas = new Map<string, ComponentOrDirectiveMetadata>();

/**
 * Registers a metadata mapping for a component or directive.
 * @param key - The unique identifier for the metadata mapping
 * @param metadataMapping - The metadata object to register
 */
export function registerMetadataMapping(key: string, metadataMapping: ComponentOrDirectiveMetadata) {
  metadatas.set(key, metadataMapping);
}

/**
 * Retrieves a metadata mapping by its key.
 * @param key - The unique identifier of the metadata mapping
 * @returns The metadata object if found, otherwise undefined
 */
export function getMetadataMapping(key: string): ComponentOrDirectiveMetadata | undefined {
  return metadatas.get(key);
}