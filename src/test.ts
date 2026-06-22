import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  @for (item of items; track item.id; i = $index; last = $last) {
    
  }
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
