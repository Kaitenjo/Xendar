/**
 * A function type that accepts no arguments and returns a value of the specified type.
 * Also known as a 'thunk' in functional programming.
 * @template ReturnType - The return type of the function (defaults to void)
 * @example
 * type GetUser = NoArgsFunction<User>;
 * const getUser: GetUser = () => ({ id: 1, name: 'John' });
 */
export type NoArgsFunction <ReturnType = void> = () => ReturnType;