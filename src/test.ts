import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
<div>
  <div>
</div>
`

const filePath = 'dist/compiled.js'
compile(template, 'TestComponent').then(output => {
  writeFileSync(filePath, output.javascript);
  writeFileSync('dist/compiled.ts', output.typescript);
}).catch(err => {
  console.error(`Failed to compile template:${String(err.message.replace(/^Error:\s*/, ''))}`)
});
