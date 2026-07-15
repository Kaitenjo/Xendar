import { NoArgsFunction } from '@xaendar/types';
import { TokenType } from '../../lexer/types/token-type.enum';
import { ImportPathToken } from '../../lexer/types/tokens/import-path-token.type';
import { ImportToken } from '../../lexer/types/tokens/import-token.type';
import { ParserCursor } from '../models/parser-cursor.model';
import { ASTNode } from '../types/ast.type';
import { ASTNodeType } from '../types/node.enum';
import { ImportNode } from '../types/nodes/import-node.type';


export function parseImport(cursor: ParserCursor, _parseNode: NoArgsFunction<ASTNode | undefined>, _token: ImportPathToken): ImportNode {
  const imports = new Array<string>();
  
  while (cursor.peek().type === TokenType.IMPORT) {
    cursor.advance();
    imports.push(cursor.getCurrentToken<ImportToken>().value.parts[0]);
  }
  
  // Consume TokenType.IMPORT_PATH
  cursor.advance();

  return {
    type: ASTNodeType.Import,
    values: imports,
    path: cursor.getCurrentToken<ImportPathToken>().value.parts[0]
  }
}
