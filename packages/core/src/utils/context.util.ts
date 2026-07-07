import { Function, NoArgsVoidFunction, VoidFunction } from '@xaendar/types';
import { BaseWebComponent } from '../directives';
import { createElement } from './render-element.util';

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
   * Map containing the run time values of variables defines during the run time execution
   * (e.g. {@for} variables: 'index', 'item', etc...)
   */
  private _variables = new Map<string, unknown>();
  /**
   * DOM nodes directly mounted into this scope via {@link mountNode} (does not
   * include nodes owned by child contexts). Used to determine, for a given
   * context, which DOM nodes belong to it — for example so `_for`'s keyed
   * diffing can move a reused item's nodes to a new position without
   * recreating them.
   */
  private _nodes = new Array<Node>();
  /**
   * Cleanup functions registered via {@link listen}.
   * Called when this context is destroyed to remove DOM nodes,
   * detach event listeners, and dispose signal effect subscriptions.
   */
  private _unwatchFns = new Array<NoArgsVoidFunction>;
  /**
   * 
   */
  public createElement: Function<[string], Element>;

  /**
   * Creates a new scope context.
   *
   * @param _root - Web component reference used to resolve property and method bindings.
   */
  constructor(
    private _root: BaseWebComponent,
    private _parent: Context,
  ) {
    this.createElement = this._parent.createElement;
  }

  /**
   * Registers a new identifier name in this scope.
   *
   * @param name - The identifier name to register.
   * @throws When an identifier with the same name is already declared in this scope.
   */
  public addIdentifier(name: string, value: unknown): void {
    if (this._variables.has(name)) {
      throw new Error(`Identifier "${name}" is already declared in this scope.`);
    }

    this._variables.set(name, value);
  }

  public removeIdentifier(name: string): void {
    this._variables.delete(name);
  }

  /**
   * Returns `true` if an identifier with the given name is declared in this
   * scope or any of its ancestor scopes.
   *
   * @param name - The identifier name to look up.
   * @returns `true` if the identifier exists in the scope chain, `false` otherwise.
   */
  public get(name: string): unknown {
    return this._variables.has(name) ? this._variables.get(name) : this._parent?.get(name);
  }

  /**
   * Returns the event handler method bound to the root component instance.
   *
   * @param handler - The name of the method on the root component to retrieve.
   * @returns The handler function, bound to the root component so `this` is correct.
   */
  public getEventHandler(handler: string): VoidFunction {
    // We do not check if the property exists beacuse it'll be done by TCB
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
    this._children = this._children.filter(child => child !== context);
  }

  /**
   * Registers a DOM node as directly owned by this context.
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
    this._nodes = this._nodes.filter(node => node !== nodeToRemove);
  }

  /**
   * Returns the DOM nodes directly owned by this context (not recursively
   * including nodes owned by child contexts), in mount order. Used by
   * `_for`'s keyed diffing to locate a reused item's nodes so they can be
   * repositioned with `insertBefore` instead of being destroyed and recreated.
   */
  public getNodes(): ReadonlyArray<Node> {
    return this._nodes;
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
    this._children = [];
    this._nodes = [];
    this._variables.clear();
  }
}

/**
 * Mounts a node into the DOM and binds it to the context lifecycle.
 *
 * Registers the node with the context, inserts it into `parentNode` at the
 * given position, and schedules a cleanup listener that removes the node
 * from both the context and the DOM when the context is destroyed.
 *
 * @param node - The node to mount.
 * @param parentNode - The parent HTML element to insert the node into.
 * @param context - The current template execution scope that owns the node's lifecycle.
 * @param referenceNode - The node to insert relative to (same semantics
 *   as `Node.insertBefore`). If `null`, the node is appended at the end of `parentNode`.
 */
export function mountNode(node: Node, parentNode: Element, context: Context, referenceNode: Comment | null = null): void {
  context.addNode(node);
  parentNode.insertBefore(node, referenceNode);

  context.listen(() => {
    context.removeNode(node);
    if (node.parentNode === parentNode) {
      parentNode.removeChild(node);
    }
  });
}

/**
 * Creates a Comment node used as a positional placeholder for dynamic content
 * (`_if`, `_for`). It is inserted immediately, in order, and stays in place for
 * the entire lifetime of the given `context`: any future insertion of dynamic
 * content is done via `insertBefore(node, anchor)`, guaranteeing the correct
 * position even when sibling constructs update independently and asynchronously.
 *
 * @param label - Textual label for the comment, useful for debugging to visually
 *   distinguish in the DOM which construct (if/for) generated the anchor.
 * @param parentNode - The parent HTML element the anchor is inserted into.
 * @param context - The Context the anchor is bound to: it determines the anchor's
 *   lifecycle, since it will be removed from the DOM when this context is destroyed.
 * @param referenceNode - The node to insert the anchor relative to (same semantics
 *   as `Node.insertBefore`). If `null`, the anchor is appended at the end of `parentNode`.
 * @returns The created Comment node, to be used as the reference point for future
 *   insertions of dynamic content via `insertBefore(node, anchor)`.
 */
export function createAnchor(label: string, parentNode: HTMLElement, context: Context, referenceNode: Comment | null = null): Comment {
  const anchor = document.createComment(label);
  mountNode(anchor, parentNode, context, referenceNode);
  return anchor;
}