/**
 * Tracks identifier scope during render code generation.
 * Each `Context` instance represents one lexical scope (e.g. a `@for` loop body)
 * and can be chained to a parent context for outer-scope resolution.
 */
export class CompilerContext {
  /**
   * Creates a new scope context.
   *
   * @param _identifiers - Named identifier bindings declared in this scope.
   * @param _parent - Optional parent context representing the enclosing scope.
   */
  constructor(
    private _identifiers = new Array<string>,
    private _parent?: CompilerContext
  ) { }

  /**
   * Registers a new identifier name in this scope.
   *
   * @param name - The identifier name to register.
   * @throws When an identifier with the same name is already declared in this scope.
   */
  public addIdentifier(name: string): void {
    if (this.hasIdentifier(name)) {
      throw new Error(`Identifier "${name}" is already declared in this scope.`);
    }
    
    this._identifiers.push(name);
  }

  public removeIdentifier(name: string): void {
    this._identifiers = this._identifiers.filter(identifier => identifier !== name);
  }

  /**
   * Returns `true` if an identifier with the given name is declared in this
   * scope or any of its ancestor scopes.
   *
   * @param name - The identifier name to look up.
   * @returns `true` if the identifier exists in the scope chain, `false` otherwise.
   */
  public hasIdentifier(name: string): boolean {
    return this._identifiers.includes(name) || (this._parent?.hasIdentifier(name) ?? false);
  }
}
