import { A, a, CR, LF, Z, z } from '../costants/chars.constants';

/**
 * Checks whether a character code represents a line feed (`\n`) or carriage return (`\r`).
 *
 * @param char - The Unicode character code to check.
 * @returns `true` if the character is LF or CR, `false` otherwise.
 */
export function isNewLine(char: number): boolean {
  return char === LF || char === CR;
}

/**
 * Checks whether a character code represents a lowercase letter (`a`–`z`).
 *
 * @param char - The Unicode character code to check.
 * @returns `true` if the character is a lowercase letter, `false` otherwise.
 */
export function isLowerCase(char: number): boolean {
  return char >= a && char <= z;
}

/**
 * Checks whether a character code represents an uppercase letter (`A`–`Z`).
 *
 * @param char - The Unicode character code to check.
 * @returns `true` if the character is an uppercase letter, `false` otherwise.
 */
export function isUpperCase(char: number): boolean {
  return char >= A && char <= Z;
}

/**
 * Checks whether a string contains at least one non-whitespace character.
 *
 * Whitespace characters include space, `\n`, `\r`, `\t`, `\f`, and `\v`.
 *
 * @param str - The string to check.
 * @returns `true` if the string is not blank, `false` if it consists entirely of whitespace.
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