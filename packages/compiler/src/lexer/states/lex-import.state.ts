import { COMMA, LEFT_BRACE, RIGHT_BRACE, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

export function lexImport(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let importValue = '';
  let importStart = cursor.currentChar.index + 1;
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
    throw `Expected { after @import`;
  }

  while (read) {
    switch (cursor.peek()) {
      case SPACE:
        cursor.skipSpaces();

        /*
          If import is not followed by ',' or '{' it means it would be followed by 
          the 'as' keyword to alias it
        */
        if (importValue && cursor.peek() !== COMMA && cursor.peek() !== RIGHT_BRACE) {
          importValue = `${importValue}`;
        }
        break;

      case COMMA:
        addImport(retVal, cursor, importValue, importStart);
        importValue = '';
        importStart = cursor.currentChar.index + 1;
        break;

      case RIGHT_BRACE:
        addImport(retVal, cursor, importValue, importStart);
        read = false;
        break;

      default:
        cursor.advance();
        importValue = `${importValue}${cursor.currentChar.value}`;
    }
  }

  return retVal
}

function addImport(retVal: LexerTransitionFunctionReturnType, cursor: LexerCursor, value: string, start: number): void {
  const end = cursor.currentChar.index + 1;
  cursor.advance();
  retVal.tokens!.push({
    type: TokenType.IMPORT,
    parts: [value],
    span: {
      start,
      end
    }
  });
}