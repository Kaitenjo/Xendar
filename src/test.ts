import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  <label style="width: 100%; height: 50px;" />
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
