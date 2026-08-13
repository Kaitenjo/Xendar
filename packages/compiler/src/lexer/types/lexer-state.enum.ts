/**
 * Represents the set of states the lexer can be in while processing template input.
 */
export enum LexerState {
  /**
   * Consuming plain text content between tags or at the top level.
   */
  TEXT = 'text',
  /**
   * Consuming the opening tag name after `<`.
   */
  TAG_OPEN_NAME = 'tag-open-name',
  /**
   * Inside an open tag body, scanning for attributes, events, or the closing `>`.
   */
  TAG_BODY  = 'tag-body',
  /**
   * Processing the end of an open tag: `>` or `/>`.
   */
  TAG_OPEN_END = 'tag-open-end',
  /**
   * Consuming a closing tag `</tagName>`.
   */
  TAG_CLOSE = 'tag-close',
  /**
   * Consuming an HTML attribute name and its optional value.
   */
  ATTRIBUTE = 'attribute',
  /**
   * Consuming a DOM event binding starting with `@`.
   */
  EVENT = 'event',
  /**
   * Consuming the handler name of a DOM event binding after `=`.
   */
  EVENT_HANDLER = 'event-handler',
  /**
   * Consuming a DOM event parameter
   */
  EVENT_PARAMETER = 'parameter',
  /**
   * Dispatching a flow-control keyword (@if, @for, @switch, etc.).
   */
  FLOW_CONTROL = 'flow-control',
  /**
   * Consuming the condition expression `(...)` of a flow-control directive.
   */
  FLOW_CONTROL_CONDITION = 'flow-control-condition',
  /**
   * Consuming the condition expression `(...)` of a @case directive.
   * This is needed to correctly handle special consecutives @case 
   */
  CASE_FLOW_CONTROL_CONDITION = 'case-flow-control-condition',
  /**
   * Consuming the opening `{` of a flow-control block body.
   */
  FLOW_CONTROL_BLOCK = 'flow-control-block',
  /**
   * Consuming an attribute literal value
   */
  ATTRIBUTE_VALUE = 'attribute-value',
  /**
   * Dispatching between an expression or literal interpolation after `{`.
   */
  INTERPOLATION = 'interpolation',
  /**
   * Consuming a JavaScript expression inside `{ }`.
   */
  INTERPOLATION_EXPRESSION = 'interpolation-expression',
  /**
   * Consuming a template-literal string inside `` {`...`} ``.
   */
  INTERPOLATION_LITERAL = 'interpolation-literal',
  /**
   * Consuming an import statement `@import { X, Y, ... }
   */
  IMPORT = 'import',

  IMPORT_PATH = 'import-path'
}
