import { ContainsChar } from './contains-char';

/**
 * Resolves to `Value` when it is a positive integer, or `never` otherwise.
 *
 * Rejects negative numbers (contain `'-'`) and non-integer numbers (contain `'.'`).
 * Useful as a compile-time constraint for length or count parameters.
 *
 * @template Value - The numeric literal to validate.
 *
 * @example
 * type Valid = PositiveInteger<5>;   // 5
 * type Invalid = PositiveInteger<-1>; // never
 * type Float = PositiveInteger<1.5>;  // never
 */
export type PositiveInteger<Value extends number> =
  ContainsChar<`${Value}`, '-'> extends true
    ? never
    : ContainsChar<`${Value}`, '.'> extends true
      ? never
        : Value;