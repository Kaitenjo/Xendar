export function slice(value: string, start?: number, end?: number): string {
  return JSON.parse(JSON.stringify(value.slice(start, end)));
} 