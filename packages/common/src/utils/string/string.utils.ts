/**
 * Returns a substring of `value`, copying the result via JSON
 * serialization (to obtain a "clean" new string instance).
 * 
 * This method ensure to resolve a note V8 Engine's problem 
 * about Sliced String and how they are hard to be garbage collectable
 * and can lead to preserve a indefinite number of closure occupying
 * unnecessary memory
 * https://stackoverflow.com/questions/79478418/how-to-correctly-unref-a-v8-substring-sliced-string-from-its-source-string
 *
 * @param value - The source string to extract the substring from.
 * @param start - The zero-based index at which to start extraction. If omitted, starts from the beginning of the string.
 *                If negative, it is treated as `value.length + start`.
 * @param end - The zero-based index at which to end extraction (exclusive). If omitted, extraction goes to the end of the string.
 *              If negative, it is treated as `value.length + end`.
 * @returns The substring extracted from `value` between `start` and `end`.
 *
 * @example
 * slice("Hello world", 0, 5); // "Hello"
 * slice("Hello world", 6);    // "world"
 * slice("Hello world", -5);   // "world"
 */
export function slice(value: string, start?: number, end?: number): string {
  return JSON.parse(JSON.stringify(value.slice(start, end)));
}