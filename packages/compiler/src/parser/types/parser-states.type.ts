import { TokenType } from "../../lexer/types/token-type.enum"
import { ForToken } from "../../lexer/types/tokens/for-token.type"
import { IfToken } from "../../lexer/types/tokens/if-token.type"
import { ImportToken } from "../../lexer/types/tokens/import-token.type"
import { InterpolationExpressionToken } from "../../lexer/types/tokens/interpolation-expression-token.type"
import { InterpolationLiteralToken } from "../../lexer/types/tokens/interpolation-literal-token.type"
import { SwitchToken } from "../../lexer/types/tokens/switch-token.type"
import { TagOpenNameToken } from "../../lexer/types/tokens/tag-open-name-token.type"
import { TextToken } from "../../lexer/types/tokens/text-token.type"
import { ParserTransitionFunction } from "./parser-transition-function.type"

type OmittedKeys = Exclude<TokenType, 
 | TokenType.TEXT
 | TokenType.INTERPOLATION_EXPRESSION
 | TokenType.INTERPOLATION_LITERAL
 | TokenType.TAG_OPEN_NAME
 | TokenType.IF
 | TokenType.FOR 
 | TokenType.SWITCH
 | TokenType.IMPORT 
>

/**
 * Type mapping each TokenType to its corresponding parser transition function, 
 * which defines how to parse that token type into an AST node.
 * 
 * This structure allows the parser to dynamically select the appropriate parsing 
 * logic based on the type of token encountered in the token stream.
 * 
 * Each entry in this mapping corresponds to a specific token type and its associated parsing function, 
 * ensuring that the parser can handle all defined token types correctly.
 */
export type ParserStates = {
  [TokenType.TEXT]: ParserTransitionFunction<TextToken>,
  [TokenType.INTERPOLATION_EXPRESSION]: ParserTransitionFunction<InterpolationExpressionToken | InterpolationLiteralToken>
  [TokenType.INTERPOLATION_LITERAL]: ParserTransitionFunction<InterpolationExpressionToken | InterpolationLiteralToken>,
  [TokenType.TAG_OPEN_NAME]: ParserTransitionFunction<TagOpenNameToken>,
  [TokenType.IF]: ParserTransitionFunction<IfToken>,
  [TokenType.FOR]: ParserTransitionFunction<ForToken>,
  [TokenType.SWITCH]: ParserTransitionFunction<SwitchToken>
  [TokenType.IMPORT]: ParserTransitionFunction<ImportToken>
} & 
{ 
  [K in OmittedKeys]?: undefined 
}