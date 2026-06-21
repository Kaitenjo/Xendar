import { NoArgsFunction, NoArgsVoidFunction } from '@xaendar/types';
import { ContextIdentifier } from '../types/context-identifier.type';
import { BaseWebComponent } from '../directives';

/**
 * Tracks identifier scope during run time template function execution
 * Each `Context` instance represents one lexical scope (e.g. a `@for` loop body)
 * and can be chained to a parent context for outer-scope resolution.
 */
export class Context {
  /** 
   * Child contexts representing nested scopes (e.g. `@for` loop iterations, `@if` branches). 
  */
  private _children = new Array<Context>;
  /** 
   * DOM nodes owned by this context, tracked for cleanup on destruction. 
  */
  private _nodes = new Array<Node>
  /**
   * Cleanup functions registered via {@link listen}.
   * Called when this context is destroyed to remove DOM nodes,
   * detach event listeners, and dispose signal effect subscriptions.
   */
  private _unwatchFns = new Array<NoArgsVoidFunction>;

  /**
   * Creates a new scope context.
   *
   * @param _root - Web component reference used to resolve property and method bindings.
   * @param _parent - Optional parent context representing the enclosing scope.
   * @param _identifiers - Named identifier bindings declared in this scope.
   */
  constructor(
    private _root: BaseWebComponent,
    private _parent: Context,
  ) { }

  /**
   * Returns the event handler method bound to the root component instance.
   *
   * @param handler - The name of the method on the root component to retrieve.
   * @returns The handler function, bound to the root component so `this` is correct.
   */
  public getEventHandler(handler: string): VoidFunction {
    return (this._root[handler] as VoidFunction).bind(this._root)
  }

  /**
   * Registers a child context as a nested scope of this context.
   *
   * @param context - The child context to add.
   */
  public addChild(context: Context): void {
    this._children.push(context);
  }

  /**
   * Removes a previously registered child context from this scope.
   *
   * @param context - The child context to remove.
   */
  public removeChild(context: Context) {
    this._children = this._children.filter(child => child === context);
  }

  /**
   * Registers a DOM node as owned by this context.
   *
   * @param node - The DOM node to track.
   */
  public addNode(node: Node): void {
    this._nodes.push(node);
  }

  /**
   * Removes a tracked DOM node from this context.
   *
   * @param nodeToRemove - The DOM node to untrack.
   */
  public removeNode(nodeToRemove: Node): void {
    this._nodes = this._nodes.filter(node => node === nodeToRemove);
  }

  /**
   * Registers one or more cleanup functions to be called when this context is destroyed.
   *
   * Cleanup functions typically remove DOM nodes, detach event listeners, or
   * dispose of signal effect subscriptions.
   *
   * @param fns - The cleanup functions to register.
   */
  public listen(...fns: NoArgsVoidFunction[]) {
    this._unwatchFns.push(...fns)
  }

  /**
   * Destroys this context by invoking all registered cleanup functions,
   * recursively destroying child contexts, and clearing internal state.
   *
   * After calling `unlisten`, this context and its entire subtree are
   * considered disposed and should no longer be used.
   */
  public unlisten(): void {
    this._unwatchFns.forEach(fn => fn());
    this._children.forEach(child => child.unlisten());
    this._unwatchFns = [];
    this._nodes = [];
  }
} 
