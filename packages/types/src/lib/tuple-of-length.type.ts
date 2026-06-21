import { PositiveInteger } from './positive-integer.type';

/**
 * Constructs a fixed-length tuple of type `TupleType` with exactly `Length`
 * elements.
 *
 * Resolves to `never` when `Length` is not a positive integer.
 *
 * @template Length - The number of elements. Must be a positive integer.
 * @template TupleType - The element type. Defaults to `number`.
 * @template Acc - Internal accumulator (do not provide manually).
 *
 * @example
 * type Three = TupleOfLength<3, string>; // [string, string, string]
 * type Bad = TupleOfLength<0, string>;   // never
 */
export type TupleOfLength<
  Length extends number,
  TupleType = number,
  Acc extends TupleType[] = []
> = PositiveInteger<Length> extends never
      ? never
      : Acc['length'] extends Length
        ? Acc
        : TupleOfLength<Length, TupleType, [...Acc, TupleType]>