import { dirname, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeCompilerHost } from './node-compiler-host.model';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  realpathSync: vi.fn(),
  statSync: vi.fn(),
}));

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';

describe('NodeCompilerHost', () => {
  let host: NodeCompilerHost;

  beforeEach(() => {
    vi.clearAllMocks();
    host = new NodeCompilerHost();
  });

  describe('readFile()', () => {
    it('returns the file contents as a UTF-8 string when the file exists', () => {
      vi.mocked(readFileSync).mockReturnValue('hello world' as any);

      expect(host.readFile('/some/file.ts')).toBe('hello world');
      expect(readFileSync).toHaveBeenCalledWith('/some/file.ts', 'utf-8');
    });

    it('returns undefined when readFileSync throws (file not found)', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });

      expect(host.readFile('/missing/file.ts')).toBeUndefined();
    });

    it('returns undefined when readFileSync throws (permission denied)', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      });

      expect(host.readFile('/restricted/file.ts')).toBeUndefined();
    });
  });

  describe('fileExists()', () => {
    it('returns true when existsSync returns true', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      expect(host.fileExists('/existing/file.ts')).toBe(true);
      expect(existsSync).toHaveBeenCalledWith('/existing/file.ts');
    });

    it('returns false when existsSync returns false', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      expect(host.fileExists('/missing/file.ts')).toBe(false);
    });
  });

  describe('resolvePath()', () => {
    it('resolves a relative path against the directory of the source file', () => {
      const from = resolve('src/features/user/user.xd.component.ts');
      const result = host.resolvePath(from, './user.xd.component.html');

      expect(result).toBe(resolve(dirname(from), './user.xd.component.html'));
    });

    it('does not alter an absolute "to" path', () => {
      const from = resolve('src/features/user/user.xd.component.ts');
      const to = resolve('absolute/template.html');
      const result = host.resolvePath(from, to);

      expect(result).toBe(to);
    });

    it('resolves parent-directory segments correctly', () => {
      const from = resolve('src/features/user/user.ts');
      const result = host.resolvePath(from, '../shared/base.html');

      expect(result).toBe(resolve(dirname(from), '../shared/base.html'));
    });
  });

  describe('getDirectoryEntries()', () => {
    it('returns the list of entry names inside the directory', () => {
      vi.mocked(readdirSync).mockReturnValue(['button', 'input', 'modal'] as any);

      const entries = host.getDirectoryEntries('/src/components');

      expect(entries).toEqual(['button', 'input', 'modal']);
      expect(readdirSync).toHaveBeenCalledWith('/src/components');
    });

    it('returns an empty array when the directory does not exist', () => {
      vi.mocked(readdirSync).mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });

      expect(host.getDirectoryEntries('/missing/dir')).toEqual([]);
    });

    it('returns an empty array when the path is a regular file', () => {
      vi.mocked(readdirSync).mockImplementation(() => {
        throw Object.assign(new Error('ENOTDIR'), { code: 'ENOTDIR' });
      });

      expect(host.getDirectoryEntries('/some/file.ts')).toEqual([]);
    });

    it('returns an empty array when the directory is not readable', () => {
      vi.mocked(readdirSync).mockImplementation(() => {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      });

      expect(host.getDirectoryEntries('/restricted/dir')).toEqual([]);
    });
  });

  describe('isDirectory()', () => {
    it('returns true when statSync reports a directory', () => {
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as any);

      expect(host.isDirectory('/some/dir')).toBe(true);
      expect(statSync).toHaveBeenCalledWith('/some/dir');
    });

    it('returns false when statSync reports a regular file', () => {
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as any);

      expect(host.isDirectory('/some/file.ts')).toBe(false);
    });

    it('returns false when the path does not exist', () => {
      vi.mocked(statSync).mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });

      expect(host.isDirectory('/missing/path')).toBe(false);
    });

    it('returns false when access is denied', () => {
      vi.mocked(statSync).mockImplementation(() => {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      });

      expect(host.isDirectory('/restricted/path')).toBe(false);
    });
  });

  describe('getRealPath()', () => {
    it('returns the resolved real path when realpathSync succeeds', () => {
      vi.mocked(realpathSync).mockReturnValue('/packages/core/src/index.ts' as any);

      const result = host.getRealPath('/app/node_modules/@xaendar/core/index.ts');

      expect(result).toBe('/packages/core/src/index.ts');
      expect(realpathSync).toHaveBeenCalledWith(
        '/app/node_modules/@xaendar/core/index.ts',
      );
    });

    it('returns the original path unchanged when realpathSync throws', () => {
      vi.mocked(realpathSync).mockImplementation(() => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      });

      const input = '/dangling/symlink';
      expect(host.getRealPath(input)).toBe(input);
    });
  });

  describe('getCurrentDirectory()', () => {
    it('returns the current working directory', () => {
      expect(host.getCurrentDirectory()).toBe(process.cwd());
    });
  });
});
