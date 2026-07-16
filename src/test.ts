import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  {\`$\{pippo} cazzo\`}
  <div  attribute="{\`$\{pippo} cazzo\`}"  value="{ value + '' + 'asd' + ' ' + "test" }" dick="{\`$\{value}asd $\{test}\`}" />
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
