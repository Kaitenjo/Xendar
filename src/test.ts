import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  <label style="width: 100%; height: 50px;" for="{id}" aria-label="{label}" @input="onInput($event)">
    {label}
  </label>
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
