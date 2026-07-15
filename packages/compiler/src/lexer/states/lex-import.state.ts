import { COMMA, LEFT_BRACE, RIGHT_BRACE, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

export function lexImport(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let importValue = '';
  let retVal: LexerTransitionFunctionReturnType = {
    state: LexerState.IMPORT_PATH,
    tokens: []
  }

  /*
    Skip all the spaces between @import and the '{'
            |
            ˅
    @import   { ...
  */
  cursor.skipSpaces();

  cursor.advance();
  if (cursor.currentChar.code !== LEFT_BRACE) {
    throw new Error(`Expected { after @import at ${cursor.formattedPosition}`);
  }

  while (read) {
    switch (cursor.peek()) {
      case SPACE:
        cursor.skipSpaces();
        break;

      case COMMA:
        addImport(retVal, cursor, importValue);
        importValue = '';
        break;

      case RIGHT_BRACE:
        addImport(retVal, cursor, importValue);
        read = false;
        break;

      default:
        cursor.advance();
        importValue = `${importValue}${cursor.currentChar.value}`;
    }
  }

  return retVal
}

function addImport(retVal: LexerTransitionFunctionReturnType, cursor: LexerCursor, value: string): void {
  cursor.advance();
  retVal.tokens!.push({
    type: TokenType.IMPORT,
    parts: [value]
  });
}