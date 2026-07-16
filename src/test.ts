import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  {\`$\{pippo} cazzo\`}
  <div  attribute="{\`$\{pippo} cazzo\`}"  value="{ value + '' + 'asd' + ' ' + "test" }" dick="{\`$\{value}asd $\{test}\`}" @click="onClick()" @click="onClick($event)" @click="onClick($event, cazzo, 'figa')" @click="onClick('palle', cazzo, 'figa')" />
  `

const filePath = 'dist/compiled.js'
const output = compile(template, 'TestComponent');
writeFileSync(filePath, output.javascript);
writeFileSync('dist/compiled.ts', output.typescript);
