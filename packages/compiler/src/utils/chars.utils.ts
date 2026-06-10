import { A, a, CR, LF, Z, z } from '../costants/chars.constants';

/**
 * Check if char code is a Line Feed (\n) or Carriage Return (\r)
 * @param char Character to control
 * @returns True if character is LF or CR, false otherwise
 */
export function isNewLine(char: number): boolean {
  return char === LF || char === CR;
}

/**
 * Check if char code is is a lower case letter
 * @param char Character to control
 * @returns True if character is a lowercase letter, false otherwise
 */
export function isLowerCase(char: number): boolean {
  return char >= a && char <= z;
}

/**
 * Check if char code is is a upper  case letter
 * @param char Character to control
 * @returns True if character is a upper case letter, false otherwise
 */
export function isUpperCase(char: number): boolean {
  return char >= A && char <= Z;
}

/**
 * Check if the string contains at least one character different from
 * ' '
 * \n
 * \r
 * \t
 * \f
 * \v
 * @param str String to check
 * @returns True if string is not blank, false otherwise
 */
export function isNotBlank(str: string): boolean {
  /* 
    Differently from the approach of the other functions
    here we are working with string and not numbers.

    Number checks are usually faster when checking a character is
    included in a specific range.
    For this case we are checking if the string contains at least one char
    different from a list of non adiacent characters in the ASCII code, resulting
    in a very long condition with multiple OR

    This has been proven slower than using a regex
  */
  return /\S/.test(str)
}

/**
 * Check if given ascii code is a valid First Character
 * for Javasript Identifiers
 * @param code The ascii code to valuate
 * @returns True if is valid, false otherwise
 */
export function isJSIdentifierStart(code: number): boolean {
  return (
    (code >= 65 && code <= 90) ||    // A-Z
    (code >= 97 && code <= 122) ||   // a-z
    code === 36 ||                   // $
    code === 95                      // _
  );
}