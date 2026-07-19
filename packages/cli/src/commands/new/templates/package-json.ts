/**
 * Generates the content of the project `package.json`.
 *
 * @param name - The project name.
 * @param version - The Xaendar packages version, read from the CLI's own package.json.
 * @returns The formatted JSON string.
 */
export function packageJson(name: string, version: string): string {
  return `{
  "name": "${name}",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "vite build",
    "start": "vite",
    "test": "vitest",
    "xd": "xd"
  },
  "dependencies": {
    "@xaendar/core": "^${version}",
    "@xaendar/signals": "^${version}",
    "@xaendar/types": "^${version}"
  },
  "devDependencies": {
    "@babel/plugin-proposal-decorators": "^8.0.2",
    "@rolldown/plugin-babel": "^0.2.3",
    "@vitest/coverage-v8": "^4.1.10",
    "@xaendar/build-tools": "^${version}",
    "@xaendar/cli": "^${version}",
    "typescript": "^6.0.3",
    "vite": "^8.1.5",
    "vitest": "^4.1.10"
  }
}
`;
}
