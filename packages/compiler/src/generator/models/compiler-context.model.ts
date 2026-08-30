/**
 * Whether a declared identifier holds a plain value or a signal.
 * Used by `resolveExpression`/`resolveIdentifier` to decide, at compile
 * time, whether generated access code needs a trailing `()` to unwrap the
 * signal — no runtime type detection is ever needed.
 */
export type IdentifierKind = 'value' | 'signal';

/**
 * Tracks identifier scope during render code generation.
 * Each `Context` instance represents one lexical scope (e.g. a `@for` loop body)
 * and can be chained to a parent context for outer-scope resolution.
 */
export class CompilerContext {
  /**
   * Parent context representing the enclosing scope.
   */
  protected parent: CompilerContext | undefined;
  /**
   * Identifiers declared directly in this scope, mapped to whether they
   * hold a plain value or a signal (e.g. `@for` implicit variables like
   * `$index` are signals; the loop item itself is a plain value).
   */
  private readonly _identifiers = new Map<string, IdentifierKind>();
  /**
   * List of identifiers that should not be resolved
   * and touched in anyway
   * (e.g. $event)
   */
  private readonly _unresolvableIdentifiers = new Map<string, IdentifierKind>()

  /**
   * Creates a new scope context.
   *
   * @param identifiers - Named identifier bindings declared in this scope.
   *   Plain strings default to kind `'value'`; pass a `[name, kind]` tuple
   *   to declare a signal-backed identifier.
   * @param parent - Optional parent context representing the enclosing scope.
   */
  constructor();
  constructor(parent: CompilerContext);
  constructor(idenfitiers: Array<string | [string, IdentifierKind]>);
  constructor(parent: CompilerContext, idenfitiers: Array<string | [string, IdentifierKind]>);
  constructor(
    parent?: CompilerContext | Array<string | [string, IdentifierKind]>,
    identifiers?: Array<string | [string, IdentifierKind]>,
  ) {
    parent instanceof CompilerContext ? this.parent = parent : identifiers = parent;
    if (identifiers?.length) {
      for (let i = 0; i < identifiers.length; i++) {
        const identifier = identifiers[i];
        typeof identifier === 'string' ? this._identifiers.set(identifier, 'value') : this._identifiers.set(identifier[0], identifier[1]);
      }
    }
  }

  /**
   * Registers a new identifier name in this scope.
   *
   * @param name - The identifier name to register.
   * @param kind - Whether the identifier holds a plain value or a signal.
   *   Defaults to `'value'`.
   * @throws When an identifier with the same name is already declared in this scope.
   */
  public addIdentifier(name: string, kind: IdentifierKind = 'value'): void {
    if (this.hasIdentifier(name)) {
      throw new Error(`Identifier "${name}" is already declared in this scope.`);
    }

    this._identifiers.set(name, kind);
  }

  /**
   * Registers a new unresolvable identifier name in this scope.
   * Unresolvable identifiers (e.g. `$event`) are tracked so lookups via
   * {@link hasIdentifier} recognize them, but they are never meant to be
   * resolved or otherwise manipulated by the compiler.
   *
   * @param name - The identifier name to register.
   * @throws When an identifier with the same name is already declared in this scope.
   */
  public addUnresolvableIdentifier(name: string, kind: IdentifierKind = 'value'): void {
    if (this.hasIdentifier(name)) {
      throw new Error(`Identifier "${name}" is already declared in this scope.`);
    }

    this._unresolvableIdentifiers.set(name, kind);
  }

  /**
   * Removes a previously registered identifier from this scope, if present.
   * Does nothing if no identifier with the given name is declared in this scope.
   * Note: this only affects the current scope, not any ancestor scopes.
   *
   * @param name - The identifier name to remove.
   */
  public removeIdentifier(name: string): void {
    this._identifiers.delete(name);
  }

  /**
   * Removes a previously registered unresolvable identifier from this scope, if present.
   * Does nothing if no unresolvable identifier with the given name is declared in this scope.
   * Note: this only affects the current scope, not any ancestor scopes.
   *
   * @param name - The identifier name to remove. 
   */
  public removeUnresolvabledIdentifier(name: string): void {
    this._unresolvableIdentifiers.delete(name);
  }

  /**
   * Returns `true` if an identifier with the given name is declared in this
   * scope or any of its ancestor scopes.
   *
   * @param name - The identifier name to look up.
   * @returns `true` if the identifier exists in the scope chain, `false` otherwise.
   */
  public hasIdentifier(name: string): boolean {
    return this._identifiers.has(name) || (this.parent?.hasIdentifier(name) ?? false);
  }

  /**
   * Resolves the kind (`'value'` or `'signal'`) of a declared identifier,
   * walking up the scope chain if not found in this scope.
   *
   * @param name - The identifier name to look up.
   * @returns The identifier's kind, or `undefined` if it isn't declared
   *   anywhere in the scope chain.
   */
  public getIdentifierKind(name: string): IdentifierKind | undefined {
    return this._identifiers.get(name) ?? this.parent?.getIdentifierKind(name);
  }

  /**
   * Returns `true` if an identifier with the given name is declared in this
   * scope or any of its ancestor scopes.
   *
   * @param name - The identifier name to look up.
   * @returns `true` if the identifier exists in the scope chain, `false` otherwise.
   */
  public hasUnresolvableIdentifier(name: string): boolean {
    return this._unresolvableIdentifiers.has(name) || (this.parent?.hasUnresolvableIdentifier(name) ?? false);
  }
}