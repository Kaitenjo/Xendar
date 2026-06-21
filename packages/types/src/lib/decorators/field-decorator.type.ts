/**
 * Represents a TC39 stage-3 class field decorator function.
 *
 * Receives the initial `undefined` value and the field decorator context.
 * Returns an initializer that maps the declared field value to its stored
 * (possibly transformed) representation.
 *
 * @template Class - The class that owns the decorated field.
 * @template Field - The declared type of the field.
 * @template ReturnType - The type the initializer transforms the value into. Defaults to `Field`.
 */
export type FieldDecorator<
  Class extends Object, 
  Field,
  ReturnType = Field
> = (field: undefined, context: ClassFieldDecoratorContext<Class, Field>) => ((value: Field) => ReturnType);