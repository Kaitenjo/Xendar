import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  @for (item of items; track item.id; i = $index; last = $last) {
    <div>
      {item, i}
    </div>
      @for (item of items; track item.id; i = $index; last = $last) {
    <div>
      {item, i}
    </div>
      @for (item of items; track item.id; i = $index; last = $last) {
    <div>
      {item, i}
    </div>
  }
  }
  }
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
