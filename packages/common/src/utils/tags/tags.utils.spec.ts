import { describe, expect, it, vi } from 'vitest';
import { assertIsValidElementName } from './tags.utils';

vi.mock('../../costants/base-tags.constants.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../costants/base-tags.constants')>();
  return {
    ...original,
    HTML_TAGS: [...original.HTML_TAGS, 'native-mock-tag'],
  };
});

describe('assertIsValidElementName()', () => {

  describe('valid custom element names', () => {
    it('does not throw for a basic hyphenated name', () => {
      expect(() => assertIsValidElementName('my-element')).not.toThrow();
    });

    it('does not throw for a name with multiple hyphens', () => {
      expect(() => assertIsValidElementName('my-custom-element')).not.toThrow();
    });

    it('does not throw for a name with digits', () => {
      expect(() => assertIsValidElementName('my-element-1')).not.toThrow();
    });

    it('does not throw for a name with dots', () => {
      expect(() => assertIsValidElementName('my.element-x')).not.toThrow();
    });

    it('does not throw for a name starting with a single letter followed by a hyphen', () => {
      expect(() => assertIsValidElementName('x-tag')).not.toThrow();
    });
  });

  describe('invalid format', () => {
    it('throws when the name has no hyphen', () => {
      expect(() => assertIsValidElementName('myelement')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name starts with a digit', () => {
      expect(() => assertIsValidElementName('1my-element')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name contains uppercase letters', () => {
      expect(() => assertIsValidElementName('My-element')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name contains spaces', () => {
      expect(() => assertIsValidElementName('my element')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name starts with a hyphen', () => {
      expect(() => assertIsValidElementName('-my-element')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name contains @', () => {
      expect(() => assertIsValidElementName('my@-element')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name contains #', () => {
      expect(() => assertIsValidElementName('my#-element')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('throws when the name is an empty string', () => {
      expect(() => assertIsValidElementName('')).toThrowError(
        /is not a valid custom element name/
      );
    });

    it('includes a description of the naming rules in the error', () => {
      expect(() => assertIsValidElementName('InvalidTag')).toThrowError(
        /contain a hyphen/
      );
    });
  });

  describe('reserved tag names', () => {
    it('throws for "annotation-xml"', () => {
      expect(() => assertIsValidElementName('annotation-xml')).toThrowError(
        /is a reserved tag name/
      );
    });

    it('throws for "color-profile"', () => {
      expect(() => assertIsValidElementName('color-profile')).toThrowError(
        /is a reserved tag name/
      );
    });

    it('throws for "font-face"', () => {
      expect(() => assertIsValidElementName('font-face')).toThrowError(
        /is a reserved tag name/
      );
    });

    it('throws for "missing-glyph"', () => {
      expect(() => assertIsValidElementName('missing-glyph')).toThrowError(
        /is a reserved tag name/
      );
    });

    it('lists the reserved names in the error message', () => {
      expect(() => assertIsValidElementName('annotation-xml')).toThrowError(
        /annotation-xml/
      );
    });
  });

  describe('native HTML tag names', () => {
    it('throws for a tag that matches a native HTML tag name', () => {
      expect(() => assertIsValidElementName('native-mock-tag')).toThrowError(
        /is a native HTML tag and cannot be used as a custom element name/
      );
    });

    it('includes the tag name in the error message', () => {
      expect(() => assertIsValidElementName('native-mock-tag')).toThrowError(
        /native-mock-tag/
      );
    });
  });
});
