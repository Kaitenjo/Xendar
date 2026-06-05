import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  @for (item of items.get(); track item.name) {
    <span>{ item.name }</span>
  }
  `

const filePath = 'test.js'
writeFileSync(filePath, compile(template));
