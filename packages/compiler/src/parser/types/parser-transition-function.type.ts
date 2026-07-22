import { NoArgsFunction } from "@xaendar/types";
import { TokenKind } from "../../lexer/types/token.type";
import { ParserCursor } from "../models/parser-cursor.model";
import { ASTNodeKind } from "./ast.type";

/**
 * The signature of a parser transition function.
 *
 * Each function receives the current parser cursor, a recursive node-parsing
 * factory, and the token that triggered the transition. It returns a single
 * AST node representing the parsed construct.
 *
 * @param cursor - The parser cursor used to navigate the token stream.
 * @param parseNode - A function used to recursively parse child nodes.
 * @param token - The token that triggered this transition.
 * @returns An AST node representing the parsed structure for the given token.
 */
export type ParserTransitionFunction<T extends TokenKind = TokenKind> = (cursor: ParserCursor, parseNode: NoArgsFunction<ASTNodeKind | undefined>, token: T) => ASTNodeKind;