import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertIsValidElementName } from './tags.utils';


describe('assertIsValidElementName()', () => {

  describe('valid custom element names', () => {
    it('returns true for a basic hyphenated name', () => {
      expect(assertIsValidElementName('my-element')).toBe(true);
    });

    it('returns true for a name with multiple hyphens', () => {
      expect(assertIsValidElementName('my-custom-element')).toBe(true);
    });

    it('returns true for a name with digits', () => {
      expect(assertIsValidElementName('my-element-1')).toBe(true);
    });

    it('returns true for a name with dots', () => {
      expect(assertIsValidElementName('my.element-x')).toBe(true);
    });

    it('returns true for a name starting with a single letter followed by a hyphen', () => {
      expect(assertIsValidElementName('x-tag')).toBe(true);
    });
  });

  describe('invalid format', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns false when the name has no hyphen', () => {
      expect(assertIsValidElementName('myelement')).toBe(false);
    });

    it('returns false when the name starts with a digit', () => {
      expect(assertIsValidElementName('1my-element')).toBe(false);
    });

    it('returns false when the name contains uppercase letters', () => {
      expect(assertIsValidElementName('My-element')).toBe(false);
    });

    it('returns false when the name contains spaces', () => {
      expect(assertIsValidElementName('my element')).toBe(false);
    });

    it('returns false when the name starts with a hyphen', () => {
      expect(assertIsValidElementName('-my-element')).toBe(false);
    });

    it('returns false when the name contains @', () => {
      expect(assertIsValidElementName('my@-element')).toBe(false);
    });

    it('returns false when the name contains #', () => {
      expect(assertIsValidElementName('my#-element')).toBe(false);
    });

    it('returns false when the name is an empty string', () => {
      expect(assertIsValidElementName('')).toBe(false);
    });

    it('logs an error containing "is not a valid custom element name"', () => {
      assertIsValidElementName('InvalidTag');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('is not a valid custom element name'));
    });

    it('logs an error with a description of the naming rules', () => {
      assertIsValidElementName('InvalidTag');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('contain a hyphen'));
    });
  });

  describe('reserved tag names', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns false for "annotation-xml"', () => {
      expect(assertIsValidElementName('annotation-xml')).toBe(false);
    });

    it('returns false for "color-profile"', () => {
      expect(assertIsValidElementName('color-profile')).toBe(false);
    });

    it('returns false for "font-face"', () => {
      expect(assertIsValidElementName('font-face')).toBe(false);
    });

    it('returns false for "missing-glyph"', () => {
      expect(assertIsValidElementName('missing-glyph')).toBe(false);
    });

    it('logs an error containing "is a reserved tag name"', () => {
      assertIsValidElementName('annotation-xml');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('is a reserved tag name'));
    });

    it('lists the reserved names in the error message', () => {
      assertIsValidElementName('annotation-xml');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('annotation-xml'));
    });
  });
});
