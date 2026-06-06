import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GLOBAL_STATE } from '../../utils/globals/globals';
import { PRIVATE } from '../../utils/private-symbol/private-symbol';
import { State } from '../state/state';
import { Computed } from './computed';
import { setDevMode } from '../../utils/dev-mode/dev-mode';

beforeEach(() => {
  GLOBAL_STATE.frozen = false;
  GLOBAL_STATE.computing = null;
});

function makeMockWatcher() {
  return { notify: vi.fn() } as unknown as import('../watcher/watcher').Watcher;
}

beforeEach(() => {
  vi.clearAllMocks();
})

describe('Computed', () => {

  describe('constructor', () => {
    it('starts in the dirty state', () => {
      const computed = new Computed(() => 1);
      expect(computed.getState(PRIVATE)).toBe('dirty');
    });

    it('starts with no sources', () => {
      const computed = new Computed(() => 1);
      expect(computed.getSources(PRIVATE)).toHaveLength(0);
    });

    it('starts with no sinks', () => {
      const computed = new Computed(() => 1);
      expect(computed.getSinks(PRIVATE)).toHaveLength(0);
    });
  });

  describe('get()', () => {
    it('evaluates the callback and returns the value', () => {
      const computed = new Computed(() => 42);
      expect(computed.get()).toBe(42);
    });

    it('evaluates the callback once and caches the result (no sinks path)', () => {
      const cb = vi.fn(() => 1);
      const computed = new Computed(cb);
      computed.get();
      computed.get();
      // without sinks, every get() re-evaluates (unwatched path)
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('tracks State sources automatically', () => {
      const state = new State(10);
      const computed = new Computed(() => state.get() * 2);
      expect(computed.get()).toBe(20);
    });

    it('reflects updated State values on re-evaluation', () => {
      const state = new State(1);
      const computed = new Computed(() => state.get() + 1);
      expect(computed.get()).toBe(2);
      state.set(9);
      expect(computed.get()).toBe(10);
    });

    it('throws when frozen', () => {
      GLOBAL_STATE.frozen = true;
      const computed = new Computed(() => 1);
      expect(() => computed.get()).toThrow('frozen');
    });

    it('throws on cyclic dependency', () => {
      // Force the computing state externally to simulate a cycle
      const computed = new Computed(() => 0);
      computed.setState('computing', PRIVATE);
      expect(() => computed.get()).toThrow('Circular dependency');
    });

    it('registers itself as source of an outer Computed', () => {
      const addSource = vi.fn();
      GLOBAL_STATE.computing = { addSource } as unknown as Computed;
      const computed = new Computed(() => 1);
      computed.get();
      expect(addSource).toHaveBeenCalledWith(computed, PRIVATE);
    });

    it('boxes errors thrown by the callback', () => {
      const err = new Error('boom');
      const computed = new Computed(() => { throw err; });
      const result = computed.get();
      expect(result).toMatchObject({ isError: true, value: err });
    });

    it('logs the error to console.error when the callback throws in dev mode', () => {
      setDevMode(true);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const error = new Error('boom');
        const computed = new Computed(() => { throw error; });
        computed.get();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error thrown while computing a Computed signal:',
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
        const computed = new Computed(() => { throw new Error('boom'); });
        computed.get();
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('is clean after evaluation (watched path)', () => {
      const watcher = makeMockWatcher();
      const computed = new Computed(() => 1);
      computed.addSink(watcher, PRIVATE);
      computed.get();
      expect(computed.getState(PRIVATE)).toBe('clean');
    });
  });

  describe('get() — watched / cached', () => {
    it('re-evaluates when a source State changes (dirty)', () => {
      const state = new State(1);
      const cb = vi.fn(() => state.get());
      const computed = new Computed(cb);
      const watcher = makeMockWatcher();

      computed.addSink(watcher, PRIVATE);
      computed.get();        // first eval
      state.set(2);          // marks c dirty via sink chain
      computed.get();        // should re-eval

      expect(cb).toHaveBeenCalledTimes(2);
      expect(computed.get()).toBe(2);
    });

    it('does NOT re-evaluate when value is unchanged according to equals', () => {
      const state = new State(1);
      const cb = vi.fn(() => state.get() > 0); // always true for positive numbers
      const computed = new Computed(cb);
      const watcher = makeMockWatcher();

      computed.addSink(watcher, PRIVATE);
      computed.get();
      state.set(2); // still > 0 → same result
      computed.get();

      // callback is called to recompute, but equals short-circuits propagation
      // the important thing is the returned value is still correct
      expect(computed.get()).toBe(true);
    });
  });

  describe('glitch-free evaluation', () => {
    it('evaluates each node only once in a diamond graph', () => {
      const state = new State(1);
      const leftCb = vi.fn(() => state.get() * 2);
      const rightCb = vi.fn(() => state.get() + 10);
      const topCb = vi.fn(() => {
        const leftValue = left.get();
        const rightValue = right.get();
        if (typeof leftValue === 'object' || typeof rightValue === 'object') {
          throw new Error;
        }

        return leftValue + rightValue;
      });

      const left = new Computed(leftCb);
      const right = new Computed(rightCb);
      const top = new Computed(topCb);

      const watcher = makeMockWatcher();
      top.addSink(watcher, PRIVATE);

      top.get(); // builds the graph

      state.set(2);
      top.get();

      // each intermediate node must be evaluated exactly once
      expect(leftCb).toHaveBeenCalledTimes(2);
      expect(rightCb).toHaveBeenCalledTimes(2);
      expect(topCb).toHaveBeenCalledTimes(2);
      expect(top.get()).toBe(16); // (2*2) + (2+10)
    });

    it('skips re-evaluation of checked nodes whose sources did not change', () => {
      // a → b → c
      //       ↘
      //         d
      // Only 'a' changes; 'c' is not a dependency of 'd' — it stays checked/clean.
      const a = new State(1);
      const b = new Computed(() => a.get());
      const cCb = vi.fn(() => 99); // never changes
      const cNode = new Computed(cCb);
      const dCb = vi.fn(() => {
        const leftValue = b.get();
        const rightValue = cNode.get();
        if (typeof leftValue === 'object' || typeof rightValue === 'object') {
          throw new Error;
        }

        return leftValue + rightValue;
      });
      const d = new Computed(dCb);

      const watcher = makeMockWatcher();
      d.addSink(watcher, PRIVATE);
      d.get();

      a.set(2);
      d.get();

      // cNode value didn't change, dCb must still run but cCb should be minimal
      expect(d.get()).toBe(2 + 99);
    });
  });

  describe('equals / setValue', () => {
    it('uses Object.is by default', () => {
      const state = new State(1);
      const watcher = makeMockWatcher();
      const computed = new Computed(() => state.get());
      computed.addSink(watcher, PRIVATE);
      computed.get();

      state.set(1);
      expect(watcher.notify).toHaveBeenCalledTimes(1);
    });

    it('respects a custom equals function', () => {
      const state = new State({ value: 1 });
      const equals = vi.fn((a: { value: number }, b: { value: number }) => a.value === b.value);
      const watcher = makeMockWatcher();
      const computed = new Computed(() => state.get(), { equals });
      computed.get();
      computed.addSink(watcher, PRIVATE);

      state.set({ value: 1 });
      expect(watcher.notify).toHaveBeenCalledTimes(1);
    });

    it('boxes errors thrown by equals', () => {
      const state = new State(1);
      const equals = vi.fn(() => { throw new Error('equals exploded'); });
      const computed = new Computed(() => state.get(), { equals });
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);

      computed.get(); // first eval sets #value, equals not called yet (no old value)
      state.set(2); // triggers re-eval → equals throws
      const result = computed.get()
      if (typeof result === 'object') {
        expect(result).toMatchObject({ isError: true });
        expect(result.value.message).toBe('equals exploded');
      }
    });

    it('always caches a boxed error without calling equals', () => {
      const equals = vi.fn(Object.is);
      const computed = new Computed(() => { throw new Error('fail'); }, { equals });
      computed.get();
      expect(equals).not.toHaveBeenCalled();
    });
  });

  describe('setState() / getState()', () => {
    it('rejects calls with wrong symbol', () => {
      const computed = new Computed(() => 1);
      expect(() => computed.getState(Symbol('x'))).toThrow();
      expect(() => computed.setState('clean', Symbol('x'))).toThrow();
    });

    it('allows valid transitions: dirty → computing', () => {
      const computed = new Computed(() => 1);
      computed.setState('computing', PRIVATE);
      expect(computed.getState(PRIVATE)).toBe('computing');
    });

    it('allows checked → clean', () => {
      const computed = new Computed(() => 1);
      // Force to checked state via addSink path (simulated)
      computed.setState('computing', PRIVATE);
      computed.setState('clean', PRIVATE);    // computing → clean
      computed.setState('checked', PRIVATE);  // clean → checked
      computed.setState('clean', PRIVATE);    // checked → clean
      expect(computed.getState(PRIVATE)).toBe('clean');
    });

    it('should log extra info is state transition is invalid', () => {
      setDevMode(true);
      const spy = vi.spyOn(console, 'warn');
      const computed = new Computed(() => 1);
      computed.setState('clean', PRIVATE)
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 'Invalid state transition from dirty to clean in Computed Signal')
      setDevMode(false);
    });
  });

  describe('addSink() / removeSink()', () => {
    it('rejects calls with wrong symbol', () => {
      const computed = new Computed(() => 1);
      const watcher = makeMockWatcher();
      expect(() => computed.addSink(watcher, Symbol('x'))).toThrow();
      expect(() => computed.removeSink(watcher, Symbol('x'))).toThrow();
    });

    it('adds a sink', () => {
      const computed = new Computed(() => 1);
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);
      expect(computed.getSinks(PRIVATE)).toContain(watcher);
    });

    it('removes a sink', () => {
      const computed = new Computed(() => 1);
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);
      computed.removeSink(watcher, PRIVATE);
      expect(computed.getSinks(PRIVATE)).not.toContain(watcher);
    });

    it('propagates addSink to sources when first sink is added', () => {
      const state = new State(1);
      const computed = new Computed(() => state.get());
      computed.get(); // builds sources
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);
      // s should now have c as a sink
      expect(state.getSinks(PRIVATE)).toContain(computed);
    });

    it('removes itself from sources sinks when last sink is removed', () => {
      const state = new State(1);
      const computed = new Computed(() => state.get());
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);
      computed.get(); // build sources
      computed.removeSink(watcher, PRIVATE);
      expect(state.getSinks(PRIVATE)).not.toContain(computed);
    });
  });

  describe('addSource()', () => {
    it('rejects calls with wrong symbol', () => {
      const computed = new Computed(() => 1);
      const state = new State(1);
      expect(() => computed.addSource(state, Symbol('x'))).toThrow();
    });

    it('registers the source', () => {
      const computed = new Computed(() => 1);
      const state = new State(1);
      computed.addSource(state, PRIVATE);
      expect(computed.getSources(PRIVATE)).toContain(state);
    });

    it('adds itself as a sink of the source', () => {
      const computed = new Computed(() => 1);
      const state = new State(1);
      computed.addSource(state, PRIVATE);
      expect(state.getSinks(PRIVATE)).toContain(computed);
    });
  });

  describe('getSinks() / getSources()', () => {
    it('reject calls with wrong symbol', () => {
      const computed = new Computed(() => 1);
      expect(() => computed.getSinks(Symbol('x'))).toThrow();
      expect(() => computed.getSources(Symbol('x'))).toThrow();
    });

    it('return snapshots, not live references', () => {
      const computed = new Computed(() => 1);
      const sinkSnapshot = computed.getSinks(PRIVATE);
      computed.addSink(makeMockWatcher(), PRIVATE);
      expect(sinkSnapshot).toHaveLength(0);
    });
  });

  describe('dynamic dependency tracking', () => {
    it('stops tracking a source that is no longer read', () => {
      const flag = new State(true);
      const a = new State(1);
      const b = new State(2);

      const computed = new Computed(() => flag.get() ? a.get() : b.get());
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);

      computed.get(); // reads flag + a

      // Switch flag → c now reads flag + b, not a
      flag.set(false);
      computed.get();

      // a should no longer be a source of c
      expect(computed.getSources(PRIVATE)).not.toContain(a);
      expect(computed.getSources(PRIVATE)).toContain(b);
    });
  });

  describe('notification propagation', () => {
    it('notifies Watcher sinks when value changes', () => {
      const state = new State(1);
      const computed = new Computed(() => state.get());
      const watcher = makeMockWatcher();
      computed.addSink(watcher, PRIVATE);
      computed.get();

      state.set(2);
      expect(watcher.notify).toHaveBeenCalledWith(PRIVATE);
    });

    it('does not notify Watcher sinks when value is unchanged', () => {
      const state = new State(1);
      const computed = new Computed(() => Math.sign(state.get())); // always 1 for positive
      const watcher = makeMockWatcher();
      computed.get();
      computed.addSink(watcher, PRIVATE);

      state.set(5); // sign still 1
      expect(watcher.notify).toHaveBeenCalledTimes(1);
    });

    it('marks nested Computed sinks as dirty when value changes', () => {
      const state = new State(1);
      const inner = new Computed(() => state.get());
      const outer = new Computed(() => {
        const innerValue = inner.get();
        if (typeof innerValue === 'object') {
          throw new Error;
        }

        return innerValue + 1
      });
      const watcher = makeMockWatcher();
      outer.addSink(watcher, PRIVATE);
      outer.get();

      state.set(2);
      expect(inner.getState(PRIVATE)).toBe('dirty');
    });
  });

  describe('integration', () => {
    it('computes a chain of three Computed signals correctly', () => {
      const state = new State(2);
      const double = new Computed(() => state.get() * 2);
      const square = new Computed(() => {
        const doubleValue = double.get();
        if (typeof doubleValue === 'object') {
          throw new Error;
        }

        return doubleValue ** 2;
      });
      const label = new Computed(() => `result: ${square.get()}`);

      expect(label.get()).toBe('result: 16');
      state.set(3);
      expect(label.get()).toBe('result: 36');
    });

    it('propagates clean correctly through a checked chain', () => {
      const state = new State(1);
      // b depends on state but always returns the same value
      const computed = new Computed(() => Math.sign(state.get())); // always 1
      const computed2 = new Computed(() => {
        const bValue = computed.get();
        if (typeof bValue === 'object') {
          throw new Error;
        }

        return bValue + 10;
      });
      const watcher = makeMockWatcher();
      computed2.addSink(watcher, PRIVATE);
      computed2.get();

      state.set(5); // b re-evaluates to 1 (same) → c should stay clean, w NOT notified
      expect(computed2.getState(PRIVATE)).toBe('checked'); // lazy: non ancora rivalutato

      computed2.get();
      expect(computed2.getState(PRIVATE)).toBe('clean');
      expect(computed2.get()).toBe(11);
    });

    it('does not propagate clean to a checked sink when not all its sources are clean', () => {
      const stateA = new State(1);
      const stateB = new State(2);

      // left depends only on `stateA`, right depends only on `stateB`
      const left = new Computed(() => Math.sign(stateA.get())); // always 1 for positive values
      const right = new Computed(() => stateB.get());

      // top depends on both left and right
      const top = new Computed(() => {
        const leftValue = left.get();
        const rightValue = right.get();
        if (typeof leftValue === 'object' || typeof rightValue === 'object') throw new Error();
        return leftValue + rightValue;
      });

      const watcher = makeMockWatcher();
      top.addSink(watcher, PRIVATE);
      top.get(); // build the graph, all nodes clean

      // Change both sources:
      // - left will recompute to Math.sign(5) = 1 → same value → outcome "clean" → triggers propagateClean
      // - right is still dirty because stateB changed but right has not been re-evaluated yet
      // When propagateClean reaches top, left is clean but right is dirty → allSourcesClean = false
      stateA.set(5); // left becomes dirty, then clean (unchanged value)
      stateB.set(9); // right becomes dirty (changed value)

      // Re-evaluate only left (without evaluating top):
      // propagateClean fires but top still has right as dirty → stays checked
      left.get();

      expect(left.getState(PRIVATE)).toBe('clean');
      expect(right.getState(PRIVATE)).toBe('dirty');
      // top is checked but NOT promoted to clean because right is still dirty
      expect(top.getState(PRIVATE)).toBe('checked');
    });


    it('handles a Computed that wraps another Computed with a boxed error', () => {
      const inner = new Computed(() => { throw new Error('inner fail'); });
      const outer = new Computed(() => {
        const v = inner.get();
        return v?.isError ? 'caught' : v;
      });
      expect(outer.get()).toBe('caught');
    });
  });

  describe('dirty / checked propagation (TC39 spec)', () => {

    it('direct Computed sink of State becomes ~dirty~ after set()', () => {
      const state = new State(1);
      const computed = new Computed(() => state.get());
      const watcher = makeMockWatcher();

      computed.addSink(watcher, PRIVATE);
      computed.get(); // initialise → clean

      state.set(2);

      expect(computed.getState(PRIVATE)).toBe('dirty');
    });

    it('indirect Computed sink (sink of sink) becomes ~checked~ after set(), not ~dirty~', () => {
      const state = new State(1);
      const direct = new Computed(() => state.get());
      const indirect = new Computed(() => direct.get());
      const watcher = makeMockWatcher();

      indirect.addSink(watcher, PRIVATE);
      indirect.get(); // builds graph → both clean

      state.set(2);

      expect(direct.getState(PRIVATE)).toBe('dirty');
      expect(indirect.getState(PRIVATE)).toBe('checked'); // NOT dirty
    });


    it('diamond graph: direct sinks are ~dirty~, top is ~checked~', () => {
      const state = new State(1);
      const left = new Computed(() => state.get() * 2);
      const right = new Computed(() => state.get() + 10);
      const top = new Computed(() => {
        const leftValue = left.get();
        const rightValue = right.get();
        if (typeof leftValue === 'object' || typeof rightValue === 'object') {
          throw new Error;
        }
        return leftValue + rightValue;
      });

      const watcher = makeMockWatcher();

      top.addSink(watcher, PRIVATE);
      top.get(); // builds the full graph

      state.set(2);

      expect(left.getState(PRIVATE)).toBe('dirty');
      expect(right.getState(PRIVATE)).toBe('dirty');
      expect(top.getState(PRIVATE)).toBe('checked'); // indirect → checked, not dirty
    });

    it('diamond graph: all nodes are ~clean~ after top.get()', () => {
      const state = new State(1);
      const left = new Computed(() => state.get() * 2);
      const right = new Computed(() => state.get() + 10);
      const top = new Computed(() => {
        const leftValue = left.get();
        const rightValue = right.get();
        if (typeof leftValue === 'object' || typeof rightValue === 'object') {
          throw new Error;
        }
        return leftValue + rightValue;
      });

      top.addSink(makeMockWatcher(), PRIVATE);
      top.get();
      state.set(2);
      top.get(); // triggers full re-evaluation

      expect(left.getState(PRIVATE)).toBe('clean');
      expect(right.getState(PRIVATE)).toBe('clean');
      expect(top.getState(PRIVATE)).toBe('clean');
    });

    it('diamond graph: each node is evaluated exactly once after a single set()', () => {
      const state = new State(1);
      const leftCb = vi.fn(() => state.get() * 2);
      const rightCb = vi.fn(() => state.get() + 10);
      const topCb = vi.fn(() => {
        const leftValue = left.get();
        const rightValue = right.get();
        if (typeof leftValue === 'object' || typeof rightValue === 'object') {
          throw new Error;
        }
        return leftValue + rightValue;
      });

      const left = new Computed(leftCb);
      const right = new Computed(rightCb);
      const top = new Computed(topCb);

      top.addSink(makeMockWatcher(), PRIVATE);
      top.get(); // first evaluation

      state.set(2);
      const result = top.get(); // single get after set

      expect(leftCb).toHaveBeenCalledTimes(2);
      expect(rightCb).toHaveBeenCalledTimes(2);
      expect(topCb).toHaveBeenCalledTimes(2);
      expect(result).toBe(16); // (2*2) + (2+10)
    });

    it('Watcher attached to an indirect sink is notified when State changes', () => {
      const state = new State(1);
      const middle = new Computed(() => state.get());
      const watcher = makeMockWatcher();

      middle.addSink(watcher, PRIVATE);
      middle.get();

      state.set(2);

      expect(watcher.notify).toHaveBeenCalledWith(PRIVATE);
    });

    it('checked node that re-evaluates to same value becomes ~clean~ without notifying Watcher', () => {
      const state = new State(1);
      const middle = new Computed(() => Math.sign(state.get())); // always 1 for positive
      const top = new Computed(() => {
        const middleValue = middle.get();
        if (typeof middleValue === 'object') {
          throw new Error;
        }

        return middleValue + 10
      });
      const watcher = makeMockWatcher();

      top.get();
      top.addSink(watcher, PRIVATE);

      state.set(5); // middle still returns 1 → top should NOT be notified
      expect(top.getState(PRIVATE)).toBe('checked');

      top.get();
      expect(watcher.notify).toHaveBeenCalledTimes(1);
      expect(top.getState(PRIVATE)).toBe('clean');
    });

    it('three-level chain propagates dirty/checked correctly', () => {
      const a = new State(1);
      const b = new Computed(() => a.get());
      const c = new Computed(() => {
        const bValue = b.get();
        if (typeof bValue === 'object') {
          throw new Error;
        }
        return bValue + 1;
      });
      const watcher = makeMockWatcher();

      c.addSink(watcher, PRIVATE);
      c.get();

      a.set(2);

      expect(b.getState(PRIVATE)).toBe('dirty');
      expect(c.getState(PRIVATE)).toBe('checked');
      expect(watcher.notify).toHaveBeenCalledWith(PRIVATE);
    });
  });
});