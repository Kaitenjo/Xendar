import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_STATE } from '../../utils/globals/globals';
import { PRIVATE } from '../../utils/private-symbol/private-symbol';
import { Computed } from '../computed/computed';
import { State } from '../state/state';
import { Watcher } from './watcher';
import { setDevMode } from '../../utils/dev-mode/dev-mode';

beforeEach(() => {
  GLOBAL_STATE.frozen = false;
  GLOBAL_STATE.computing = null;
});

describe('Watcher', () => {

  describe('constructor', () => {
    it('starts in ~waiting~ state', () => {
      const watcher = new Watcher(vi.fn());
      expect(watcher.getState(PRIVATE)).toBe('waiting');
    });

    it('starts with no sources', () => {
      const watcher = new Watcher(vi.fn());
      expect(watcher.getSources(PRIVATE)).toHaveLength(0);
    });
  });

  describe('watch()', () => {
    it('transitions to ~watching~ after the first watch call', () => {
      const watcher = new Watcher(vi.fn());
      watcher.watch(new State(1));
      expect(watcher.getState(PRIVATE)).toBe('watching');
    });

    it('adds signals to the sources set', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      expect(watcher.getSources(PRIVATE)).toContain(state);
    });

    it('can watch multiple signals at once', () => {
      const watcher = new Watcher(vi.fn());
      const state1 = new State(1);
      const state2 = new State(2);
      watcher.watch(state1, state2);
      expect(watcher.getSources(PRIVATE)).toEqual(expect.arrayContaining([state1, state2]));
    });

    it('registers itself as a sink of the watched signal', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      expect(state.getSinks(PRIVATE)).toContain(watcher);
    });

    it('throws when trying to watch an already-watched signal', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      expect(() => watcher.watch(state)).toThrow();
    });

    it('throws when called while frozen', () => {
      GLOBAL_STATE.frozen = true;
      const watcher = new Watcher(vi.fn());
      expect(() => watcher.watch(new State(1))).toThrow('frozen');
    });

    it('can watch a Computed signal', () => {
      const watcher = new Watcher(vi.fn());
      const c = new Computed(() => 1);
      watcher.watch(c);
      expect(watcher.getSources(PRIVATE)).toContain(c);
    });
  });

  describe('unwatch()', () => {
    it('removes the signal from the sources set', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      watcher.unwatch(state);
      expect(watcher.getSources(PRIVATE)).not.toContain(state);
    });

    it('transitions back to ~waiting~ when all signals are unwatched', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      watcher.unwatch(state);
      expect(watcher.getState(PRIVATE)).toBe('waiting');
    });

    it('stays ~watching~ when other signals remain', () => {
      const watcher = new Watcher(vi.fn());
      const state1 = new State(1);
      const state2 = new State(2);
      watcher.watch(state1, state2);
      watcher.unwatch(state1);
      expect(watcher.getState(PRIVATE)).toBe('watching');
    });

    it('removes itself from the signal sinks', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      watcher.unwatch(state);
      expect(state.getSinks(PRIVATE)).not.toContain(watcher);
    });

    it('throws when trying to unwatch a signal that is not being watched', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      expect(() => watcher.unwatch(state)).toThrow();
    });

    it('throws when called while frozen', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      GLOBAL_STATE.frozen = true;
      expect(() => watcher.unwatch(state)).toThrow('frozen');
    });
  });

  describe('notify()', () => {
    it('rejects calls without the private symbol', () => {
      const watcher = new Watcher(vi.fn());
      expect(() => watcher.notify(Symbol('x'))).toThrow();
    });

    it('invokes the notify callback', () => {
      const cb = vi.fn();
      const watcher = new Watcher(cb);
      watcher.watch();
      watcher.notify(PRIVATE);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('calls the notify callback with the Watcher as `this`', () => {
      let thisRef: unknown;
      const cb = vi.fn(function (this: unknown) { thisRef = this; });
      const watcher = new Watcher(cb);
      watcher.watch();
      watcher.notify(PRIVATE);
      expect(thisRef).toBe(watcher);
    });

    it('freezes the global state while the callback runs', () => {
      let frozenDuring = false;
      const cb = vi.fn(() => { frozenDuring = GLOBAL_STATE.frozen; });
      const watcher = new Watcher(cb);
      watcher.watch();
      watcher.notify(PRIVATE);
      expect(frozenDuring).toBe(true);
    });

    it('unfreezes after the callback, even if it throws', () => {
      const cb = vi.fn(() => { throw new Error('boom'); });
      const watcher = new Watcher(cb);
      watcher.watch();
      expect(() => watcher.notify(PRIVATE)).toThrow('boom');
      expect(GLOBAL_STATE.frozen).toBe(false);
    });

    it('logs the error to console.error when the callback throws in dev mode', () => {
      setDevMode(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const error = new Error('boom');
        const cb = vi.fn(() => { throw error; });
        const watcher = new Watcher(cb);
        watcher.watch();
        expect(() => watcher.notify(PRIVATE)).toThrow('boom');
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error thrown while running a Watcher notify callback:',
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
        const cb = vi.fn(() => { throw new Error('boom'); });
        const watcher = new Watcher(cb);
        watcher.watch();
        expect(() => watcher.notify(PRIVATE)).toThrow('boom');
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('transitions to ~watching~ after the callback runs', () => {
      const watcher = new Watcher(vi.fn());
      watcher.watch(new State(1));
      watcher.notify(PRIVATE);
      expect(watcher.getState(PRIVATE)).toBe('waiting');
    });

    it('is called when a watched State changes', () => {
      const cb = vi.fn();
      const watcher = new Watcher(cb);
      const state = new State(1);
      watcher.watch(state);

      cb.mockClear();
      state.set(2);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('is called twice for multiple State changes (transitions to waiting after first)', () => {
      const cb = vi.fn();
      const watcher = new Watcher(cb);
      const state = new State(1);
      watcher.watch(state);

      // After the first set, watcher goes ~waiting~ → subsequent sets don't
      // re-trigger notify until watch() is called again.
      cb.mockClear();
      state.set(2);
      state.set(3);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('is called when a watched Computed dependency changes', () => {
      const cb = vi.fn();
      const watcher = new Watcher(cb);
      const state = new State(1);
      const computed = new Computed(() => state.get());
      watcher.watch(computed);
      computed.get();

      cb.mockClear();
      state.set(2);
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('getPending()', () => {
    it('returns an empty array when nothing is dirty or checked', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      const c = new Computed(() => state.get());
      watcher.watch(c);
      c.get();
      expect(watcher.getPending()).toHaveLength(0);
    });

    it('returns dirty Computed signals', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      const c = new Computed(() => state.get());
      watcher.watch(c);
      c.get();

      state.set(2); // c becomes dirty
      expect(watcher.getPending()).toContain(c);
    });

    it('returns checked Computed signals', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      const middle = new Computed(() => state.get());
      const top = new Computed(() => middle.get());
      watcher.watch(top);
      top.get();

      state.set(2); // middle dirty, top checked
      expect(watcher.getPending()).toContain(top);
    });

    it('does not return State signals', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      watcher.watch(state);
      state.set(2);
      // getPending filters only Computed instances
      expect(watcher.getPending().every(p => p instanceof Computed)).toBe(true);
    });

    it('does not return clean Computed signals', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      const c = new Computed(() => Math.sign(state.get())); // always 1 for positive
      watcher.watch(c);
      c.get();

      state.set(5); // c re-evaluates to same value → stays/becomes clean
      c.get();  // pull to resolve
      expect(watcher.getPending()).not.toContain(c);
    });
  });

  describe('getState() / setState()', () => {
    it('rejects calls with wrong symbol', () => {
      const watcher = new Watcher(vi.fn());
      expect(() => watcher.getState(Symbol('x'))).toThrow();
      expect(() => watcher.setState('watching', Symbol('x'))).toThrow();
    });

    it('allows valid transition: waiting → watching', () => {
      const watcher = new Watcher(vi.fn());
      watcher.setState('watching', PRIVATE);
      expect(watcher.getState(PRIVATE)).toBe('watching');
    });

    it('allows valid transition: watching → waiting', () => {
      const watcher = new Watcher(vi.fn());
      watcher.setState('watching', PRIVATE);
      watcher.setState('waiting', PRIVATE);
      expect(watcher.getState(PRIVATE)).toBe('waiting');
    });

    it('ignores invalid transitions silently', () => {
      const watcher = new Watcher(vi.fn()); // waiting
      watcher.setState('pending', PRIVATE); // waiting → pending is invalid
      expect(watcher.getState(PRIVATE)).toBe('waiting');
    });

    it('exit gratefully if state is equal to current state', () => {
      const watcher = new Watcher(vi.fn());
      expect(() => watcher.setState('waiting', PRIVATE)).not.toThrow();
      expect(watcher.getState(PRIVATE)).toBe('waiting');
    });

    it('should log extra info is state transition is invalid', () => {
      setDevMode(true);
      const spy = vi.spyOn(console, 'warn');
      const watcher = new Watcher(vi.fn());
      watcher.setState('pending', PRIVATE)
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 'Invalid state transition from waiting to pending in Watcher')
      setDevMode(false);
    });
  });

  describe('getSources()', () => {
    it('rejects calls with wrong symbol', () => {
      const watcher = new Watcher(vi.fn());
      expect(() => watcher.getSources(Symbol('x'))).toThrow();
    });

    it('returns a snapshot, not a live reference', () => {
      const watcher = new Watcher(vi.fn());
      const snapshot = watcher.getSources(PRIVATE);
      watcher.watch(new State(1));
      expect(snapshot).toHaveLength(0);
    });
  });

  describe('integration', () => {
    it('full lifecycle: watch → notify → unwatch', () => {
      const events: string[] = [];
      const cb = vi.fn(() => events.push('notify'));
      const watcher = new Watcher(cb);
      const state = new State(1);

      watcher.watch(state);
      events.push('watching');

      state.set(2);
      events.push('after-set');

      watcher.unwatch(state);
      events.push('unwatched');

      expect(events).toEqual(['watching', 'notify', 'after-set', 'unwatched']);
    });

    it('does not notify after unwatch', () => {
      const cb = vi.fn();
      const watcher = new Watcher(cb);
      const state = new State(1);
      watcher.watch(state);
      watcher.unwatch(state);

      cb.mockClear();
      state.set(2);
      expect(cb).not.toHaveBeenCalled();
    });

    it('watching a Computed builds the full dependency chain up to State', () => {
      const watcher = new Watcher(vi.fn());
      const state = new State(1);
      const computed = new Computed(() => state.get());
      watcher.watch(computed);
      computed.get();

      // s should have c as a sink (chain built)
      expect(state.getSinks(PRIVATE)).toContain(computed);
    });
  });
});