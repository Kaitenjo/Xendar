import { NoArgsFunction } from "@xaendar/types";
import { ParserCursor } from "../models/parser-cursor.model";
import { ASTNode } from "./ast.type";
import { Token } from "../../lexer/types/token.type";

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
export type ParserTransitionFunction<T extends Token = Token> = (cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, token: T) => ASTNode;