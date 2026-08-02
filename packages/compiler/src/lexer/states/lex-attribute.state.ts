import { DOUBLE_QUOTE, EQUAL_THEN, GREATER_THEN, LEFT_BRACE, SINGLE_QUOTE, SLASH, SPACE } from '../../costants/chars.constants';
import { LexerCursor } from '../types/lexer-cursor.model';
import { LexerState } from '../types/lexer-state.enum';
import { TokenType } from '../types/token-type.enum';
import { LexerTransitionFunctionContext } from '../types/transition-function/transition-function-context.type';
import { LexerTransitionFunctionReturnType } from '../types/transition-function/transition-function-return-type.type';

/**
 * Consumes an attribute name and optional value from the current position,
 * transitioning back to TAG_BODY when a space, `/`, or `>` is encountered.
 * If the attribute value is an interpolation, pushes the INTERPOLATION state.
 *
 * @param cursor - The lexer cursor positioned at the start of the attribute.
 * @param _context - Unused lexer context.
 * @returns Transition result with the ATTRIBUTE token and next state.
 */
export function lexAttribute(cursor: LexerCursor, _context: LexerTransitionFunctionContext): LexerTransitionFunctionReturnType {
  let read = true;
  let attribute = '';
  let retVal!: LexerTransitionFunctionReturnType;
  
  while (read) {
    switch (cursor.peek()) {
      /*
        Cover the cases where the attribute is applied without any value
        Ex:
        <input disabled />
      */
      case SPACE:
        cursor.advance();
        read = false;
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{
            type: TokenType.ATTRIBUTE,
            parts: [attribute]
          }]
        }
        break;

      /*
        Cover cases where the attribute name is immediately followed by '>' or '/'
        without a separating space.
        Ex:
        <input disabled>
        <input disabled/>
      */
      case GREATER_THEN:
      case SLASH:
        read = false;
        retVal = {
          state: LexerState.TAG_BODY,
          tokens: [{
            type: TokenType.ATTRIBUTE,
            parts: [attribute]
          }]
        }
        break;

      case EQUAL_THEN:
        /*
          Unlike event handler where we can simply throw error if eventName is
          followed by a space instead of "=", in the attributes the situation is 
          different.

          Attributes can have a name without any value
          e.g. <input disabled />
          
          So we cannot throw if an attribute is followed by a space instead of "="
          But we have to check if we find a "=" without a previous valid attribute name
          e.g. <input disabled ="false" />
        */
        if (!attribute) {
          throw new Error('Attribute cannot start with \'=\'');
        }

        cursor.advance();
        
        // If attribute has a value, it must start with double quotes
        if (cursor.peek() !== DOUBLE_QUOTE) {
          throw new Error(`Attribute value must start with double quotes '"'`);
        }

        // Consume '"'
        cursor.advance();
        read = false;
        const isInterpolatedValue = cursor.peek() === LEFT_BRACE;

        retVal = {
          state: isInterpolatedValue ? LexerState.INTERPOLATION : LexerState.ATTRIBUTE_VALUE,
          pushState: true,
          tokens: [{
            type: TokenType.ATTRIBUTE,
            parts: [attribute]
          }]
        }
        break;

      case DOUBLE_QUOTE:
      case SINGLE_QUOTE:
        /*
          Break is missing or purpose cause the code after the if 
          would be the same as default case
        */
        if (!attribute) {
          throw new Error('Attribute cannot start with \' or \"');
        }

      default:
        cursor.advance();
        attribute = `${attribute}${cursor.currentChar.value}`;
    }
  }

  return retVal;
}