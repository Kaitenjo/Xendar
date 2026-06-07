import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidCustomElementName } from './tags.utils';


describe('isValidCustomElementName()', () => {

  describe('valid custom element names', () => {
    it('returns true for a basic hyphenated name', () => {
      expect(isValidCustomElementName('my-element')).toBe(true);
    });

    it('returns true for a name with multiple hyphens', () => {
      expect(isValidCustomElementName('my-custom-element')).toBe(true);
    });

    it('returns true for a name with digits', () => {
      expect(isValidCustomElementName('my-element-1')).toBe(true);
    });

    it('returns true for a name with dots', () => {
      expect(isValidCustomElementName('my.element-x')).toBe(true);
    });

    it('returns true for a name starting with a single letter followed by a hyphen', () => {
      expect(isValidCustomElementName('x-tag')).toBe(true);
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
      expect(isValidCustomElementName('myelement')).toBe(false);
    });

    it('returns false when the name starts with a digit', () => {
      expect(isValidCustomElementName('1my-element')).toBe(false);
    });

    it('returns false when the name contains uppercase letters', () => {
      expect(isValidCustomElementName('My-element')).toBe(false);
    });

    it('returns false when the name contains spaces', () => {
      expect(isValidCustomElementName('my element')).toBe(false);
    });

    it('returns false when the name starts with a hyphen', () => {
      expect(isValidCustomElementName('-my-element')).toBe(false);
    });

    it('returns false when the name contains @', () => {
      expect(isValidCustomElementName('my@-element')).toBe(false);
    });

    it('returns false when the name contains #', () => {
      expect(isValidCustomElementName('my#-element')).toBe(false);
    });

    it('returns false when the name is an empty string', () => {
      expect(isValidCustomElementName('')).toBe(false);
    });

    it('logs an error containing "is not a valid custom element name"', () => {
      isValidCustomElementName('InvalidTag');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('is not a valid custom element name'));
    });

    it('logs an error with a description of the naming rules', () => {
      isValidCustomElementName('InvalidTag');
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
      expect(isValidCustomElementName('annotation-xml')).toBe(false);
    });

    it('returns false for "color-profile"', () => {
      expect(isValidCustomElementName('color-profile')).toBe(false);
    });

    it('returns false for "font-face"', () => {
      expect(isValidCustomElementName('font-face')).toBe(false);
    });

    it('returns false for "missing-glyph"', () => {
      expect(isValidCustomElementName('missing-glyph')).toBe(false);
    });

    it('logs an error containing "is a reserved tag name"', () => {
      isValidCustomElementName('annotation-xml');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('is a reserved tag name'));
    });

    it('lists the reserved names in the error message', () => {
      isValidCustomElementName('annotation-xml');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('annotation-xml'));
    });
  });
});
