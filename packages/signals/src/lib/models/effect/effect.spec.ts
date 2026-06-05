import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_STATE } from '../../utils/globals/globals';
import { loadSignals } from '../../load-signals';
import { State } from '../state/state';
import { effect } from './effect';

loadSignals();

/**
 * Helper: flushes the microtask queue so that scheduled effect
 * re-runs are executed synchronously within the test.
 */
const flushMicrotasks = () => new Promise<void>(resolve => queueMicrotask(resolve));

beforeEach(() => {
  GLOBAL_STATE.frozen = false;
  GLOBAL_STATE.computing = null;
});

describe('effect', () => {

  describe('initial execution', () => {
    it('runs the callback synchronously on creation', () => {
      const spy = vi.fn();
      effect(spy);
      expect(spy).toHaveBeenCalledOnce();
    });

    it('reads the current value of tracked signals', () => {
      const state = new State(42);
      let captured: number | undefined;

      effect(() => { captured = state.get(); });

      expect(captured).toBe(42);
    });
  });

  describe('reactivity', () => {
    it('re-runs when a tracked signal changes', async () => {
      const state = new State(0);
      const spy = vi.fn();

      effect(() => { spy(state.get()); });
      expect(spy).toHaveBeenCalledWith(0);

      state.set(1);
      await flushMicrotasks();

      expect(spy).toHaveBeenCalledWith(1);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('batches multiple synchronous updates into a single re-run', async () => {
      const state = new State(0);
      const spy = vi.fn();

      effect(() => { spy(state.get()); });

      state.set(1);
      state.set(2);
      state.set(3);
      await flushMicrotasks();

      // Only 2 calls total: initial + one batched re-run
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith(3);
    });

    it('tracks multiple signals', async () => {
      const greeting = new State('hello');
      const subject = new State('world');
      const spy = vi.fn();

      effect(() => { spy(`${greeting.get()} ${subject.get()}`); });
      expect(spy).toHaveBeenCalledWith('hello world');

      greeting.set('ciao');
      await flushMicrotasks();
      expect(spy).toHaveBeenCalledWith('ciao world');

      subject.set('mondo');
      await flushMicrotasks();
      expect(spy).toHaveBeenCalledWith('ciao mondo');
    });

    it('re-tracks dependencies on each run (dynamic deps)', async () => {
      const toggle = new State(true);
      const primary = new State('A');
      const fallback = new State('B');
      const spy = vi.fn();

      effect(() => {
        spy(toggle.get() ? primary.get() : fallback.get());
      });
      expect(spy).toHaveBeenLastCalledWith('A');

      // Change fallback — should NOT trigger because fallback is not tracked
      fallback.set('B2');
      await flushMicrotasks();
      expect(spy).toHaveBeenCalledTimes(1);

      // Switch branch — now fallback is tracked, primary is not
      toggle.set(false);
      await flushMicrotasks();
      expect(spy).toHaveBeenLastCalledWith('B2');

      // Change primary — should NOT trigger
      primary.set('A2');
      await flushMicrotasks();
      expect(spy).toHaveBeenCalledTimes(2); // initial + toggle switch
    });

    it('does not re-run when set to the same value (equality check)', async () => {
      const state = new State(1);
      const spy = vi.fn();

      effect(() => { spy(state.get()); });

      state.set(1); // same value
      await flushMicrotasks();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('options', () => {

    describe('onBeforeRun', () => {
      it('is called before the initial execution', () => {
        const order: string[] = [];
        effect(
          () => { order.push('fn'); },
          { onBeforeRun: () => order.push('before') }
        );
        expect(order).toEqual(['before', 'fn']);
      });

      it('is called before each re-run', async () => {
        const state = new State(0);
        const order: string[] = [];

        effect(
          () => { order.push(`fn(${state.get()})`); },
          { onBeforeRun: () => order.push('before') }
        );

        order.length = 0; // ignore initial run
        state.set(1);
        await flushMicrotasks();

        expect(order).toEqual(['before', 'fn(1)']);
      });
    });

    describe('onAfterRun', () => {
      it('is called after the initial execution', () => {
        const order: string[] = [];
        effect(
          () => { order.push('fn'); },
          { onAfterRun: () => order.push('after') }
        );
        expect(order).toEqual(['fn', 'after']);
      });

      it('is called after each re-run', async () => {
        const state = new State(0);
        const order: string[] = [];

        effect(
          () => { order.push(`fn(${state.get()})`); },
          { onAfterRun: () => order.push('after') }
        );

        order.length = 0; // ignore initial run
        state.set(1);
        await flushMicrotasks();

        expect(order).toEqual(['fn(1)', 'after']);
      });
    });

    describe('onBeforeRun + onAfterRun together', () => {
      it('wraps each run with before and after hooks in the correct order', async () => {
        const state = new State(0);
        const order: string[] = [];

        effect(
          () => { order.push(`fn(${state.get()})`); },
          {
            onBeforeRun: () => order.push('before'),
            onAfterRun: () => order.push('after'),
          }
        );

        expect(order).toEqual(['before', 'fn(0)', 'after']);

        order.length = 0;
        state.set(1);
        await flushMicrotasks();

        expect(order).toEqual(['before', 'fn(1)', 'after']);
      });
    });

    describe('onCleanup', () => {
      it('is called when the disposer is invoked', () => {
        const spy = vi.fn();
        const dispose = effect(() => {}, { onCleanup: spy });

        expect(spy).not.toHaveBeenCalled();
        dispose();
        expect(spy).toHaveBeenCalledOnce();
      });

      it('is not called before disposal', async () => {
        const state = new State(0);
        const spy = vi.fn();

        const dispose = effect(() => { state.get(); }, { onCleanup: spy });
        state.set(1);
        await flushMicrotasks();

        expect(spy).not.toHaveBeenCalled();

        dispose();
        expect(spy).toHaveBeenCalledOnce();
      });
    });
  });

  describe('disposal', () => {
    it('returns a disposer function', () => {
      const dispose = effect(() => {});
      expect(typeof dispose).toBe('function');
    });

    it('stops re-running after disposal', async () => {
      const state = new State(0);
      const spy = vi.fn();

      const dispose = effect(() => { spy(state.get()); });
      expect(spy).toHaveBeenCalledTimes(1);

      dispose();

      state.set(1);
      await flushMicrotasks();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('throws if called multiple times (already unwatched)', () => {
      const dispose = effect(() => {});
      dispose();
      expect(() => dispose()).toThrow();
    });
  });
});
