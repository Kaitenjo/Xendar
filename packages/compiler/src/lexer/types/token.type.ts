import { Span } from '../../types/span.type';
import { TokenType } from './token-type.enum';
import { AttributeToken } from './tokens/attribute-token.type';
import { AttributeValueToken } from './tokens/attribute-value-token.type';
import { BlockCloseToken } from './tokens/block-close-token.type';
import { BlockOpenToken } from './tokens/block-open-token.type';
import { CaseToken } from './tokens/case-token.type';
import { ConditionToken } from './tokens/condition-token.type';
import { DefaultToken } from './tokens/default-token.type';
import { ElseIfToken } from './tokens/else-if-token.type';
import { ElseToken } from './tokens/else-token.type';
import { EOFToken } from './tokens/eof-token.type';
import { EventParemeterToken } from './tokens/event-parameter-token.type';
import { EventToken } from './tokens/event-token.type';
import { ForToken } from './tokens/for-token.type';
import { IfToken } from './tokens/if-token.type';
import { ImportPathToken } from './tokens/import-path-token.type';
import { ImportToken } from './tokens/import-token.type';
import { InterpolationExpressionToken } from './tokens/interpolation-expression-token.type';
import { InterpolationLiteralToken } from './tokens/interpolation-literal-token.type';
import { SwitchToken } from './tokens/switch-token.type';
import { TagCloseNameToken } from './tokens/tag-close-name-token.type';
import { TagCloseToken } from './tokens/tag-close-token.type';
import { TagOpenNameToken } from './tokens/tag-open-name-token.type';
import { TagSelfCloseToken } from './tokens/tag-self-close-token.type';
import { TextToken } from './tokens/text-token.type';

/**
 * Union of all token types that the lexer can emit during tokenization.
 */
export type Token =
  | TagOpenNameToken
  | TagSelfCloseToken
  | TagCloseToken
  | TagCloseNameToken
  | AttributeToken
  | AttributeValueToken
  | EventToken
  | EventParemeterToken
  | TextToken
  | InterpolationExpressionToken
  | InterpolationLiteralToken
  | IfToken
  | ElseIfToken
  | ElseToken
  | ForToken
  | SwitchToken
  | CaseToken
  | DefaultToken
  | ConditionToken
  | BlockOpenToken
  | BlockCloseToken
  | ImportToken
  | ImportPathToken
  | EOFToken;

export type TokenWithOptionalSpan = 
  | MaybeTokenWithSpan<TagOpenNameToken>
  | MaybeTokenWithSpan<TagSelfCloseToken>
  | MaybeTokenWithSpan<TagCloseToken>
  | MaybeTokenWithSpan<TagCloseNameToken>
  | MaybeTokenWithSpan<AttributeToken>
  | MaybeTokenWithSpan<AttributeValueToken>
  | MaybeTokenWithSpan<EventToken>
  | MaybeTokenWithSpan<EventParemeterToken>
  | MaybeTokenWithSpan<TextToken>
  | MaybeTokenWithSpan<InterpolationExpressionToken>
  | MaybeTokenWithSpan<InterpolationLiteralToken>
  | MaybeTokenWithSpan<IfToken>
  | MaybeTokenWithSpan<ElseIfToken>
  | MaybeTokenWithSpan<ElseToken>
  | MaybeTokenWithSpan<ForToken>
  | MaybeTokenWithSpan<SwitchToken>
  | MaybeTokenWithSpan<CaseToken>
  | MaybeTokenWithSpan<DefaultToken>
  | MaybeTokenWithSpan<ConditionToken>
  | MaybeTokenWithSpan<BlockOpenToken>
  | MaybeTokenWithSpan<BlockCloseToken>
  | MaybeTokenWithSpan<ImportToken>
  | MaybeTokenWithSpan<ImportPathToken>;

export type TokenWithSpan<T extends { type: TokenType }> = T & {
  span: Span
}

export type MaybeTokenWithSpan<T extends { type: TokenType, span: Span }> = Omit<T, 'span'> & Partial<Pick<T, 'span'>>;

