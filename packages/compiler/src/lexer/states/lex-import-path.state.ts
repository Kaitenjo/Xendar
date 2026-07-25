import { DOUBLE_QUOTE, SINGLE_QUOTE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

export function lexImportPath(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let path = '';
  let retVal!: LexerTransitionFunctionReturnType
  let singleQuote = false;

  /*
    Skip all the spaces between '}' and the from
      |
      ˅
    }    from
  */
  cursor.skipSpaces();

  if (!cursor.peekMatch('from')) {
    throw new Error(`Expected 'from' keyword after import list at ${cursor.formattedPosition}`);
  }

  cursor.advance(4);

  /*
    Skip all the spaces between from and the path delimiter
          |
          ˅
    from    'my/path/...'
  */
  cursor.skipSpaces();


  // Consume ' or "
  cursor.advance();
  
  switch (cursor.currentChar.code) {
    case SINGLE_QUOTE:
      singleQuote = true;
      break;

    case DOUBLE_QUOTE:
      break;
    
    default:
      throw new Error(`Import statement must start with ' or ".\nFound character ${cursor.currentChar.value} at ${cursor.formattedPosition}`)
  }

  const delimiter = singleQuote ? SINGLE_QUOTE : DOUBLE_QUOTE;

  while(read) {
    switch (cursor.peek()) {
      case delimiter:
        cursor.advance();
        read = false;
        retVal = {
          state: LexerState.TEXT,
          tokens: [{
            type: TokenType.IMPORT_PATH,
            parts: [path]
          }]
        }
        break;
      
      default: 
        cursor.advance();
        path = `${path}${cursor.currentChar.value}`;
    }
  }


  return retVal
}