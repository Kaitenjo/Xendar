import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_STATE } from './utils/globals/globals';
import { setDevMode } from './utils/dev-mode/dev-mode';
import { loadSignals } from './load-signals';
import { Computed } from './models/computed/computed';
import { State } from './models/state/state';
import { Watcher } from './models/watcher/watcher';
import { currentComputed, hasSinks, hasSources, introspectSinks, introspectSources, untrack } from './subtle';

loadSignals();

beforeEach(() => {
  GLOBAL_STATE.frozen = false;
  GLOBAL_STATE.computing = null;
});

describe('subtle', () => {

  describe('untrack()', () => {
    it('returns the value produced by the function', () => {
      expect(untrack(() => 42)).toBe(42);
    });

    it('does not track signal reads inside the callback', () => {
      const state = new State(0);
      const computed = new Computed(() => {
        untrack(() => state.get());
        return 1;
      });

      computed.get();

      expect(introspectSources(computed)).toHaveLength(0);
    });

    it('reads performed outside untrack are still tracked normally', () => {
      const tracked = new State('a');
      const untracked = new State('b');

      const computed = new Computed(() => {
        tracked.get();
        untrack(() => untracked.get());
        return null;
      });

      computed.get();

      const sources = introspectSources(computed);
      expect(sources).toContain(tracked);
      expect(sources).not.toContain(untracked);
    });

    it('restores the previous computing context after execution', () => {
      const outer = new Computed(() => {
        untrack(() => {});
        return GLOBAL_STATE.computing;
      });

      const result = outer.get();
      expect(result).toBe(outer);
    });

    it('restores context even when the callback throws', () => {
      const prevComputing = GLOBAL_STATE.computing;
      expect(() => untrack(() => { throw new Error('boom'); })).toThrow('boom');
      expect(GLOBAL_STATE.computing).toBe(prevComputing);
    });

    it('logs the error to console.error when the callback throws in dev mode', () => {
      setDevMode(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const error = new Error('boom');
        expect(() => untrack(() => { throw error; })).toThrow('boom');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error thrown while running an Untracked signal:',
          error
        );
      } finally {
        consoleSpy.mockRestore();
        setDevMode(false);
      }
    });

    it('does not log to console.error when the callback throws outside dev mode', () => {
      setDevMode(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        expect(() => untrack(() => { throw new Error('boom'); })).toThrow('boom');
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('currentComputed()', () => {
    it('returns null when no Computed is being evaluated', () => {
      expect(currentComputed()).toBeNull();
    });

    it('returns the active Computed instance during its evaluation', () => {
      let captured: Computed | null = null;

      const computed = new Computed(() => {
        captured = currentComputed();
        return 0;
      });

      computed.get();

      expect(captured).toBe(computed);
    });

    it('returns null again after the Computed evaluation finishes', () => {
      const computed = new Computed(() => 1);
      computed.get();
      expect(currentComputed()).toBeNull();
    });
  });

  describe('introspectSources()', () => {
    it('returns an empty array for a Computed that has never been evaluated', () => {
      const computed = new Computed(() => 1);
      expect(introspectSources(computed)).toHaveLength(0);
    });

    it('returns the State signals read during evaluation', () => {
      const a = new State(1);
      const b = new State(2);
      const computed = new Computed(() => a.get() + b.get());

      computed.get();

      const sources = introspectSources(computed);
      expect(sources).toContain(a);
      expect(sources).toContain(b);
    });

    it('returns signals watched by a Watcher', () => {
      const state = new State(0);
      const watcher = new Watcher(vi.fn());
      watcher.watch(state);

      expect(introspectSources(watcher)).toContain(state);
    });

    it('returns an empty array for a Watcher with no watched signals', () => {
      const watcher = new Watcher(vi.fn());
      expect(introspectSources(watcher)).toHaveLength(0);
    });
  });

  describe('introspectSinks()', () => {
    it('returns an empty array for a State with no dependents', () => {
      const state = new State(0);
      expect(introspectSinks(state)).toHaveLength(0);
    });

    it('includes a Watcher that watches the State', () => {
      const state = new State(0);
      const watcher = new Watcher(vi.fn());
      watcher.watch(state);

      expect(introspectSinks(state)).toContain(watcher);
    });

    it('includes a Computed that reads the State (when the Computed is watched)', () => {
      const state = new State(0);
      const computed = new Computed(() => state.get());
      const watcher = new Watcher(vi.fn());
      watcher.watch(computed);
      computed.get();

      expect(introspectSinks(state)).toContain(computed);
    });

    it('returns an empty array for a Computed with no dependents', () => {
      const state = new State(0);
      const computed = new Computed(() => state.get());
      computed.get();

      expect(introspectSinks(computed)).toHaveLength(0);
    });
  });

  describe('hasSinks()', () => {
    it('returns false for a State with no dependents', () => {
      expect(hasSinks(new State(0))).toBe(false);
    });

    it('returns true for a State watched by a Watcher', () => {
      const state = new State(0);
      const watcher = new Watcher(vi.fn());
      watcher.watch(state);

      expect(hasSinks(state)).toBe(true);
    });

    it('returns false for a Computed with no dependents', () => {
      const computed = new Computed(() => 1);
      computed.get();
      expect(hasSinks(computed)).toBe(false);
    });

    it('returns true for a Computed that is watched', () => {
      const computed = new Computed(() => 1);
      const watcher = new Watcher(vi.fn());
      watcher.watch(computed);

      expect(hasSinks(computed)).toBe(true);
    });
  });

  describe('hasSources()', () => {
    it('returns false for a Computed that has never been evaluated', () => {
      const computed = new Computed(() => 1);
      expect(hasSources(computed)).toBe(false);
    });

    it('returns false for a Computed whose callback reads no signals', () => {
      const computed = new Computed(() => 42);
      computed.get();
      expect(hasSources(computed)).toBe(false);
    });

    it('returns true for a Computed that reads at least one State', () => {
      const state = new State(0);
      const computed = new Computed(() => state.get());
      computed.get();

      expect(hasSources(computed)).toBe(true);
    });

    it('returns false for a Watcher with no watched signals', () => {
      const watcher = new Watcher(vi.fn());
      expect(hasSources(watcher)).toBe(false);
    });

    it('returns true for a Watcher that watches at least one signal', () => {
      const watcher = new Watcher(vi.fn());
      watcher.watch(new State(0));

      expect(hasSources(watcher)).toBe(true);
    });
  });
});
