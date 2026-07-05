export type IterationVariablesHandle = {
  vars: Record<string, unknown>;
  update: (newIndex: number, items: unknown[]) => void;
};