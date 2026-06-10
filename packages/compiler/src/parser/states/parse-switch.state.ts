import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { SwitchToken } from '../../lexer/types/tokens/switch-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { CaseNode } from '../types/nodes/case-node.type';
import { SwitchNode } from '../types/nodes/switch-node.type';
import { validateExpression } from '../utils/expression-validator';
import { parseBlockChildren } from './parse-block-children.state';

/**
 * Parses a `@switch` directive, consuming the SWITCH token, the CONDITION token,
 * the outer BLOCK_OPEN, all `@case` and `@default` branches, and the outer BLOCK_CLOSE.
 *
 * @param cursor Parser cursor positioned at the SWITCH token.
 * @param parseNode Parser function for recursive child parsing.
 * @param _token The SWITCH token (unused; consumed for position advancement).
 * @returns The parsed `SwitchNode`.
 */
export function parseSwitchControlFlow(cursor: ParserCursor, parseNode: NoArgsFunction<ASTNode | undefined>, _token: SwitchToken): SwitchNode {
  // consume SWITCH
  cursor.advance();

  const conditionToken = cursor.peek();
  if (conditionToken.type !== TokenType.CONDITION) {
    throw new Error(`[Parser] Expected CONDITION after SWITCH, got ${TokenType[conditionToken.type]}`);
  }

  const expression = validateExpression(conditionToken.parts[0]).node;
  // consume CONDITION and BLOCK_OPEN
  cursor.advance(2);

  const cases = new Array<CaseNode>;

  while (cursor.peek().type !== TokenType.BLOCK_CLOSE) {
    const token = cursor.peek();

    switch (token.type) {
      case TokenType.CASE:
        const condition = new Array<string>;
        
        /*
          We loop to support block case with multiple conditions, e.g.:
          @switch (x) {
            @case (1) 
            @case (2) {
              // ...
            }
          }
        */
        do {
          // consume CASE
          cursor.advance();

          const caseCondition = cursor.peek();
          if (caseCondition.type !== TokenType.CONDITION) {
            throw new Error(`[Parser] Expected CONDITION after CASE`);
          }
  
          condition.push(caseCondition.parts[0]);
          // consume CONDITION
          cursor.advance();
        } while (cursor.peek().type !== TokenType.BLOCK_OPEN);

        // consume BLOCK_OPEN
        cursor.advance();
        
        cases.push({
          type: ASTNodeType.Case, 
          condition, 
          children: parseBlockChildren(cursor, parseNode) 
        });
        break;

      case TokenType.DEFAULT:
        // consume DEFAULT and BLOCK_OPEN
        cursor.advance(2);
        cases.push({
          type: ASTNodeType.Case, 
          condition: null, 
          children: parseBlockChildren(cursor, parseNode) 
        });
        break;

    }
  }

  // consume outer BLOCK_CLOSE
  cursor.advance();

  return {
    type: ASTNodeType.Switch,
    expression,
    cases
  };
}
