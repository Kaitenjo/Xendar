import { Function } from '../functions/function.type';

/**
 * Represents a TC39 stage-3 class method decorator function.
 *
 * Receives the original method and its decorator context, and may return a
 * replacement method or `void` to leave the original unchanged.
 *
 * @template T - The class that owns the decorated method.
 * @template Method - The type of the method being decorated.
 */
export type MethodDecorator<
 T extends Object,
  Method extends Function
> = (value: Method, context: ClassMethodDecoratorContext<T, Method>) => Method | void;