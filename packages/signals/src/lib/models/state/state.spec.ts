import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_STATE } from '../../utils/globals/globals';
import { PRIVATE } from '../../utils/private-symbol/private-symbol';
import { setDevMode } from '../../utils/dev-mode/dev-mode';
import { Computed } from '../computed/computed';
import { State } from './state';

function makeMockWatcher() {
  return {
    notify: vi.fn(),
  } as unknown as import('../watcher/watcher').Watcher;
}

beforeEach(() => {
  GLOBAL_STATE.frozen = false;
  GLOBAL_STATE.computing = null;
});

describe('State', () => {

  describe('constructor', () => {
    it('stores the initial value', () => {
      const state = new State(42);
      expect(state.get()).toBe(42);
    });

    it('accepts any serialisable value as initial value', () => {
      const obj = { a: 1 };
      const state = new State(obj);
      expect(state.get()).toBe(obj);
    });

    it('initialises with an empty sinks set', () => {
      const state = new State(0);
      expect(state.getSinks(PRIVATE)).toHaveLength(0);
    });
  });

  describe('get()', () => {
    it('returns the current value', () => {
      const state = new State('hello');
      expect(state.get()).toBe('hello');
    });

    it('throws when signals are frozen', () => {
      GLOBAL_STATE.frozen = true;
      const state = new State(1);
      expect(() => state.get()).toThrow('Cannot get value while signals are frozen');
    });

    it('registers the state as a source of the currently computing Computed', () => {
      const addSource = vi.fn();
      GLOBAL_STATE.computing = { addSource } as any;

      const state = new State(99);
      state.get();

      expect(addSource).toHaveBeenCalledOnce();
      expect(addSource).toHaveBeenCalledWith(state, PRIVATE);
    });

    it('does not call addSource when there is no computing Computed', () => {
      // Should not throw; GLOBAL_STATE.computing is undefined
      const state = new State(1);
      expect(() => state.get()).not.toThrow();
    });
  });

  describe('set()', () => {
    it('updates the value', () => {
      const state = new State(1);
      state.set(2);
      expect(state.get()).toBe(2);
    });

    it('throws when signals are frozen', () => {
      GLOBAL_STATE.frozen = true;
      const state = new State(1);
      expect(() => state.set(2)).toThrow('Cannot set value while signals are frozen');
    });

    it('does not update when new value equals current value (Object.is)', () => {
      const state = new State(5);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);

      state.set(5); // same value
      expect(watcher.notify).not.toHaveBeenCalled();
    });

    it('notifies Watcher sinks when value changes', () => {
      const state = new State(1);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);

      state.set(2);
      expect(watcher.notify).toHaveBeenCalledOnce();
      expect(watcher.notify).toHaveBeenCalledWith(PRIVATE);
    });

    it('marks Computed sinks as dirty when value changes', () => {
      const state = new State(1);
      const computed = new Computed(() => state.get() * 2);
      const setStateSpy = vi.spyOn(computed, 'setState');
      state.addSink(computed, PRIVATE);

      state.set(2);
      expect(setStateSpy).toHaveBeenCalledOnce();
      expect(setStateSpy).toHaveBeenCalledWith('dirty', PRIVATE);
    });

    it('notifies multiple sinks', () => {
      const state = new State(0);
      const watcher1 = makeMockWatcher();
      const watcher2 = makeMockWatcher();
      state.addSink(watcher1, PRIVATE);
      state.addSink(watcher2, PRIVATE);

      state.set(1);
      expect(watcher1.notify).toHaveBeenCalledOnce();
      expect(watcher2.notify).toHaveBeenCalledOnce();
    });

    it('uses a custom equals function', () => {
      // Always returns true → value is never considered changed
      const equals = vi.fn(() => true);
      const state = new State(1, { equals });
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);

      state.set(999);
      expect(watcher.notify).not.toHaveBeenCalled();
    });

    it('calls equals with the correct arguments', () => {
      const equals = vi.fn(Object.is);
      const state = new State(1, { equals });
      state.set(2);

      expect(equals).toHaveBeenCalledWith(1, 2);
    });

    it('calls equals bound to the signal instance', () => {
      let thisRef: unknown;
      const equals = vi.fn(function (this: unknown) {
        thisRef = this;
        return false;
      });
      const state = new State(1, { equals });
      state.set(2);

      expect(thisRef).toBe(state);
    });
  });

  describe('addSink()', () => {
    it('rejects calls without the private symbol', () => {
      const state = new State(0);
      expect(() => state.addSink(makeMockWatcher(), Symbol('wrong'))).toThrow();
    });

    it('adds a sink to the sinks set', () => {
      const state = new State(0);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      expect(state.getSinks(PRIVATE)).toContain(watcher);
    });

    it('invokes the watched callback the first time a sink is added', () => {
      const watched = vi.fn();
      const state = new State(0, { watched });
      state.addSink(makeMockWatcher(), PRIVATE);
      expect(watched).toHaveBeenCalledOnce();
    });

    it('does not invoke watched callback again for subsequent sinks', () => {
      const watched = vi.fn();
      const state = new State(0, { watched });
      state.addSink(makeMockWatcher(), PRIVATE);
      state.addSink(makeMockWatcher(), PRIVATE);
      expect(watched).toHaveBeenCalledOnce();
    });

    it('freezes signals while watched callback executes', () => {
      let frozenDuring = false;
      const state = new State(0, {
        watched() {
          frozenDuring = GLOBAL_STATE.frozen;
        },
      });
      state.addSink(makeMockWatcher(), PRIVATE);
      expect(frozenDuring).toBe(true);
    });

    it('unfreezes signals after watched callback, even if it throws', () => {
      const state = new State(0, {
        watched() { throw new Error('boom'); },
      });
      expect(() => state.addSink(makeMockWatcher(), PRIVATE)).toThrow('boom');
      expect(GLOBAL_STATE.frozen).toBe(false);
    });

    it('logs the error to console.error when the watched callback throws in dev mode', () => {
      setDevMode(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const error = new Error('boom');
        const state = new State(0, { watched() { throw error; } });
        expect(() => state.addSink(makeMockWatcher(), PRIVATE)).toThrow('boom');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error thrown while running a State Signal watched callback:',
          error
        );
      } finally {
        consoleSpy.mockRestore();
        setDevMode(false);
      }
    });

    it('does not log to console.error when the watched callback throws outside dev mode', () => {
      setDevMode(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const state = new State(0, { watched() { throw new Error('boom'); } });
        expect(() => state.addSink(makeMockWatcher(), PRIVATE)).toThrow('boom');
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('removeSink()', () => {
    it('rejects calls without the private symbol', () => {
      const state = new State(0);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      expect(() => state.removeSink(watcher, Symbol('wrong'))).toThrow();
    });

    it('removes the sink from the sinks set', () => {
      const state = new State(0);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      state.removeSink(watcher, PRIVATE);
      expect(state.getSinks(PRIVATE)).not.toContain(watcher);
    });

    it('invokes the unwatched callback when last sink is removed', () => {
      const unwatched = vi.fn();
      const state = new State(0, { unwatched });
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      state.removeSink(watcher, PRIVATE);
      expect(unwatched).toHaveBeenCalledOnce();
    });

    it('does not invoke unwatched callback while other sinks remain', () => {
      const unwatched = vi.fn();
      const state = new State(0, { unwatched });
      const watcher1 = makeMockWatcher();
      const watcher2 = makeMockWatcher();
      state.addSink(watcher1, PRIVATE);
      state.addSink(watcher2, PRIVATE);
      state.removeSink(watcher1, PRIVATE);
      expect(unwatched).not.toHaveBeenCalled();
    });

    it('freezes signals while unwatched callback executes', () => {
      let frozenDuring = false;
      const state = new State(0, {
        unwatched() {
          frozenDuring = GLOBAL_STATE.frozen;
        },
      });
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      state.removeSink(watcher, PRIVATE);
      expect(frozenDuring).toBe(true);
    });

    it('unfreezes signals after unwatched callback, even if it throws', () => {
      const state = new State(0, {
        unwatched() { throw new Error('boom'); },
      });
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      expect(() => state.removeSink(watcher, PRIVATE)).toThrow('boom');
      expect(GLOBAL_STATE.frozen).toBe(false);
    });

    it('logs the error to console.error when the unwatched callback throws in dev mode', () => {
      setDevMode(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const error = new Error('boom');
        const state = new State(0, { unwatched() { throw error; } });
        const watcher = makeMockWatcher();
        state.addSink(watcher, PRIVATE);
        expect(() => state.removeSink(watcher, PRIVATE)).toThrow('boom');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error thrown while running a State Signal unwatched callback:',
          error
        );
      } finally {
        consoleSpy.mockRestore();
        setDevMode(false);
      }
    });

    it('does not log to console.error when the unwatched callback throws outside dev mode', () => {
      setDevMode(false);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const state = new State(0, { unwatched() { throw new Error('boom'); } });
        const watcher = makeMockWatcher();
        state.addSink(watcher, PRIVATE);
        expect(() => state.removeSink(watcher, PRIVATE)).toThrow('boom');
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('no longer notifies a removed sink on set()', () => {
      const state = new State(0);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      state.removeSink(watcher, PRIVATE);

      state.set(1);
      expect(watcher.notify).not.toHaveBeenCalled();
    });
  });

  describe('getSinks()', () => {
    it('rejects calls without the private symbol', () => {
      const state = new State(0);
      expect(() => state.getSinks(Symbol('wrong'))).toThrow();
    });

    it('returns a snapshot array, not the live set', () => {
      const state = new State(0);
      const snapshot = state.getSinks(PRIVATE);
      state.addSink(makeMockWatcher(), PRIVATE);
      // The snapshot taken before addSink should still be empty
      expect(snapshot).toHaveLength(0);
    });

    it('lists all currently registered sinks', () => {
      const state = new State(0);
      const watcher1 = makeMockWatcher();
      const watcher2 = makeMockWatcher();
      state.addSink(watcher1, PRIVATE);
      state.addSink(watcher2, PRIVATE);
      expect(state.getSinks(PRIVATE)).toEqual(expect.arrayContaining([watcher1, watcher2]));
    });
  });

  describe('integration', () => {
    it('watched → set → unwatched lifecycle fires callbacks in order', () => {
      const calls: string[] = [];
      const state = new State(0, {
        watched()   { calls.push('watched'); },
        unwatched() { calls.push('unwatched'); },
      });
      const watcher = makeMockWatcher();

      state.addSink(watcher, PRIVATE);
      state.set(1);
      state.removeSink(watcher, PRIVATE);

      expect(calls).toEqual(['watched', 'unwatched']);
    });

    it('adding the same sink twice does not duplicate it', () => {
      const state = new State(0);
      const watcher = makeMockWatcher();
      state.addSink(watcher, PRIVATE);
      state.addSink(watcher, PRIVATE);
      expect(state.getSinks(PRIVATE)).toHaveLength(1);
    });

    it('propagates changes to mixed Computed and Watcher sinks', () => {
      const state = new State(0);
      const watcher  = makeMockWatcher();
      const computed = new Computed(() => state.get() * 2);
      const setStateSpy = vi.spyOn(computed, 'setState');
      state.addSink(watcher, PRIVATE);
      state.addSink(computed, PRIVATE);

      state.set(1);
      expect(watcher.notify).toHaveBeenCalledOnce();
      expect(setStateSpy).toHaveBeenCalledWith('dirty', PRIVATE);
    });
  });
});