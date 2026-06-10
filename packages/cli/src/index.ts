#!/usr/bin/env node
import { program } from 'commander';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateCommand } from './commands/generate/generate.command';
import { newCommand } from './commands/new/new.command';

const version = JSON.parse(readFileSync(resolve(import.meta.filename, '..', '../package.json'), 'utf-8')).version;

program
  .name('xd')
  .description('Xaendar CLI')
  .version(version);

program.addCommand(generateCommand());
program.addCommand(newCommand());

program.parse();
