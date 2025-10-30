export function If(predicate: unknown, code: string): string {
  return !!predicate ? code : '';
}

export function IfElse(predicate: unknown, truePredicate: string, falsePredicate: string): string {
  return !!predicate ? truePredicate : falsePredicate;
}

export function For<T>(arr: T[], template: (item: T, index: number) => string): string {
  return arr.map(template).join('');
}

export function Switch<T extends string | number = string>(value: T, cases: Record<T, string> & { default?: string }): string {
  return cases[value] ?? cases.default ?? '';
}