/**
 * Discriminant values that identify the type of each token emitted by the lexer.
 */
export enum TokenType {
  /**
   * A plain text node between tags or at the top level.
   */
  TEXT,
  /**
   * The name portion of an opening tag, e.g. `div` in `<div`.
   */
  TAG_OPEN_NAME,
  /**
   * A self-closing tag marker `/>`.
   */
  TAG_SELF_CLOSE,
  /**
   * The closing `>` of an opening tag.
   */
  TAG_OPEN_END,
  /**
   * The name portion of a closing tag, e.g. `div` in `</div>`.
   */
  TAG_CLOSE_NAME,
  /**
   * An HTML attribute
   */
  ATTRIBUTE,
  /**
   * An HTML attribute literal value
   */
  ATTRIBUTE_VALUE,
  /**
    * A DOM event name declared in a binding like `@eventName=handler`.
   */
  EVENT,
  /**
   * The event handler name declared in a binding like `@eventName=handler`.
   */
  EVENT_HANDLER,
  /**
   * An event parAmeter included in a event call '()'
   */
  EVENT_PARAMETER,
  /**
   * A template-literal interpolation string enclosed in `` {`...`} ``.
   */
  INTERPOLATION_LITERAL,
  /**
   * A JavaScript expression interpolation enclosed in `{ }`.
   */
  INTERPOLATION_EXPRESSION,
  /**
   * Opening keyword of an `@if` directive.
   */
  IF,
  /**
   * Opening keyword of a `@for` directive.
   */
  FOR,
  /**
   * Opening keyword of an `@else` branch.
   */
  ELSE,
  /**
   * Opening keyword of an `@else if` branch.
   */
  ELSE_IF,
  /**
   * Opening keyword of a `@switch` directive.
   */
  SWITCH,
  /**
   * Opening keyword of a `@case` branch.
   */
  CASE,
  /**
   * Opening keyword of a `@default` branch.
   */
  DEFAULT,
  /**
   * The condition expression `(...)` associated with a flow-control directive.
   */
  CONDITION,
  /**
   * The opening `{` of a flow-control block body.
   */
  BLOCK_OPEN,
  /**
   * The closing `}` of a flow-control block body.
   */
  BLOCK_CLOSE,

  IMPORT,

  IMPORT_PATH,
  /**
   * Sentinel token emitted when the end of the input is reached.
   */
  EOF
}
