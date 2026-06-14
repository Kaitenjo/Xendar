import { describe, expect, it } from 'vitest';
import { indent } from './indent.utils';

describe('indent()', () => {

  it('prepends two spaces to a single line', () => {
    expect(indent('hello')).toEqual('  hello');
  });

  it('prepends two spaces to each of multiple lines', () => {
    expect(indent(['foo', 'bar', 'baz'])).toEqual(['  foo', '  bar', '  baz']);
  });

  it('also indents empty strings', () => {
    expect(indent('')).toEqual('  ');
  });

  it('preserves existing indentation', () => {
    expect(indent('  already indented')).toEqual('    already indented');
  });

  it('does not mutate the input arguments', () => {
    const lines = ['a', 'b'];
    indent(lines);
    expect(lines).toEqual(['a', 'b']);
  });
});
