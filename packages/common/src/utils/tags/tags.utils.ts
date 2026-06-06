import { HTML_TAGS } from '../../costants/base-tags.constants.js';
import { NOT_ALLOWED_TAGS } from '../../costants/not-alllowed-tags.constants.js';

/**
 * Asserts that a given tag name is valid for use as a custom element name.
 * A valid custom element name must:
 * - contain a hyphen
 * - no spaces.
 * - start with a lowercase letter.
 * - not contain uppercase letters.
 * - not contain the following chars: '@', '#', '$', '%', '&', '*', '!', '?', '/', '\\', '|', "'", '"', '<', '>', '='
 * - not be a native HTML tag name.
 * - not be a reserved tag name.
 * @param tagName The tag name to validate.
 * @throws Will throw an error if the tag name is invalid.
 */
export function assertIsValidElementName(tagName: string): void {
  if (!/^[a-z][a-z0-9._\-]*-[a-z0-9._\-]*$/.test(tagName)) {
    throw new Error(`Tag <${tagName}> is not a valid custom element name. Custom element names must:
- contain a hyphen
- no spaces. 
- start with a lowercase letter. 
- not contain uppercase letters. 
- not contain the following chars: '@', '#', '$', '%', '&', '*', '!', '?', '/', '\\', '|', "'", '"', '<', '>', '='
`);
  }

  if (isNativeHTMLTag(tagName)) {
    throw new Error(`Tag <${tagName}> is a native HTML tag and cannot be used as a custom element name.`);
  }

  if (isReservedTagName(tagName)) {
    throw new Error(`Tag <${tagName}> is a reserved tag name and cannot be used as a custom element name.
Reserved names are: 
- ${NOT_ALLOWED_TAGS.join('\n- ')}`);
  }
}

/**
 * Checks if a tag name is a native HTML tag.
 * 
 * @param tagName - The tag name to check.
 * @returns `true` if the tag name is a standard HTML tag, `false` otherwise.
 */
function isNativeHTMLTag(tagName: string): boolean {
  return HTML_TAGS.includes(tagName);
}

/**
 * Checks if a tag name is reserved and cannot be used for a custom element.
 * 
 * Reserved names include certain HTML, SVG, or other names that are forbidden by the specification.
 * https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 * 
 * @param tagName - The tag name to check.
 * @returns `true` if the tag name is reserved, `false` otherwise.
 */
function isReservedTagName(tagName: string): boolean {
  return NOT_ALLOWED_TAGS.includes(tagName);
}