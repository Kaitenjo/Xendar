export type ClassAccessorDecorator<Class extends Object, Field = unknown> = (
  value: ClassAccessorDecoratorValue<Field>,
  context: ClassAccessorDecoratorContext<Class, Field>
) => {
  get?: () => Field;
  set?: (value: Field) => void;
  init?: (initialValue: Field) => Field;
} | void;

export type ClassAccessorDecoratorValue<Field = unknown> = {
  get?: () => Field;
  set: (value: Field) => void;
};
