/**
 * Discriminant values that identify the type of each AST node produced by the parser.
 */
export enum ASTNodeType {
  /**
   * An HTML element node with a tag name, attributes, events, and children.
   */
  Element,
  /**
   * A plain text node.
   */
  Text,
  /**
   * An inline interpolation expression or literal.
   */
  Interpolation,
  /**
   * An `@if` conditional node.
   */
  If,
  /**
   * An `@else` branch node attached to an `@if`.
   */
  Else,
  /**
   * An `@else if` branch node attached to an `@if`.
   */
  ElseIf,
  /**
   * An `@for` iteration node.
   */
  For,
  /**
   * An `@switch` node containing one or more case nodes.
   */
  Switch,
  /**
   * A `@case` or `@default` branch inside a `@switch`.
   */
  Case,
  /**
   *
   */
  Import
}