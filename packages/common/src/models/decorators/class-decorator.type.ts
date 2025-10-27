import { Constructor } from "../constructors/constructor.type";

export type ClassDecorator<T extends Object, Statics extends string[] = []> = (klass: Constructor<T, Statics>, context: ClassDecoratorContext) => void