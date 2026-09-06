import type { Function, VoidFunction } from '@xaendar/types';
import { ComponentOrDirectiveMetadata } from '../../types/component-or-directive-metadata.type';

export type TypeCheckerCache = {
  /**
   * Retrieve cached metadata by key.
   *
   * @param key - The cache key (typically the absolute file path)
   * @returns The cached metadata, or undefined if not found
   */
  get: Function<[string], ComponentOrDirectiveMetadata | undefined>;
  /**
 * Store metadata in the cache.
 *
 * @param key - The cache key (typically the absolute file path)
 * @param value - The metadata value to cache
 */
  set: VoidFunction<[string, ComponentOrDirectiveMetadata]>;
}