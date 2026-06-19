import { NoArgsFunction } from '@xaendar/types';
import { ContextIdentifier } from '../types/context-identifier.type';

/**
 * Tracks identifier scope during run time template function execution
 * Each `Context` instance represents one lexical scope (e.g. a `@for` loop body)
 * and can be chained to a parent context for outer-scope resolution.
 */
export class Context {
  /**
   * Creates a new scope context.
   *
   * @param _identifiers List of loop variable names declared in this scope.
   * @param _parent Optional parent context representing the enclosing scope.
   */
  constructor(
    private _identifiers = new Map<string, ContextIdentifier>(),
    private _parent?: Context
  ) { }

  public addIdentifier(name: string, valueFn: NoArgsFunction<unknown>): void {
    if (this.getIdentifier(name)) {
      throw new Error(`Identifier "${name}" is already declared in this scope.`);
    }
    
    this._identifiers.set(name, {
      get: valueFn,
      reactive: true
    });
  }

  /**
   * Returns the innermost identifier in the current scope chain, or
   * delegates to the parent context if none is found in this scope.
   *
   * @returns The most recently declared identifier name, or `undefined` if none exists.
   */
  public getIdentifier<ReturnType = unknown>(name: string): ContextIdentifier<ReturnType> | undefined {
    return this._identifiers.has(name) ? this._identifiers.get(name) as ContextIdentifier<ReturnType> | undefined : this._parent?.getIdentifier(name);
  }
}
