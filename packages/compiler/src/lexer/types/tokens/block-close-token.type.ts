import { TokenType } from '../token-type.enum';
import { TokenWithSpan } from '../token.type';

/**
 * Token emitted when the lexer encounters the closing `}` of a flow-control block body.
 */
export type BlockCloseToken = TokenWithSpan<{
  /**
   * Discriminant identifying this token as a block close.
   */
  type: TokenType.BLOCK_CLOSE
}>
