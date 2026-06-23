import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  <div @click="onClick($event, test, test2, 'asd')">
  </div>
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
