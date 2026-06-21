import { Constructor } from '../constructors/constructor.type';

/**
 * Represents a TC39 stage-3 class decorator function.
 *
 * Receives the class constructor and its decorator context and may return a
 * replacement constructor or `void` to leave the original unchanged.
 *
 * @template T - The instance type of the decorated class.
 * @template Statics - Optional static members of the class.
 */
export type ClassDecorator<
  T extends Object, 
  Statics extends { [key: string]: any } = { [key: string]: any }
> = (klass: Constructor<T, Statics>, context: ClassDecoratorContext) => void