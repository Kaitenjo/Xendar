import { Constructor } from "../constructors/constructor.type";

export type ClassDecorator<T extends Object, Statics extends { [key: string]: any } = { [key: string]: any }> = (klass: Constructor<T, Statics>, context: ClassDecoratorContext) => void