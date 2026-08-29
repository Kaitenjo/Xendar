import { Command } from 'commander';
import babel from '@rolldown/plugin-babel';
import { createServer } from 'vite';
import { xaendarPlugin } from '@xaendar/build-tools';

export function startCommand(): Command {
  return new Command('start')
    .alias('s')
    .description('Start the project')
    .action(async () => {
      const server = await createServer({
        plugins: [
          babel({
            presets: [
              {
                preset: () => ({
                  plugins: [
                    [
                      "@babel/plugin-proposal-decorators",
                      { version: "2023-11" }
                    ]
                  ]
                }),
                rolldown: {
                  filter: {
                    code: "@"
                  }
                }
              }
            ]
          }),
          xaendarPlugin()
        ],
      });

      await server.listen();
    });
}