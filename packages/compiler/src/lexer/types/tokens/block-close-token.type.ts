import { TokenType } from '../token-type.enum';

/**
 * Token emitted when the lexer encounters the closing `}` of a flow-control block body.
 */
export type BlockCloseToken = {
  /**
   * Discriminant identifying this token as a block close.
   */
  type: TokenType.BLOCK_CLOSE
}
