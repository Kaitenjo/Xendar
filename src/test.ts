import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
@import { Pippo } from '/path/...'
@import { Pluto } from "my/path2/..."

@for (row of items(); track row.id) {
  <tr>
    <td>{{ row.id }}</td>
    <td>{{ row.name }}</td>
    <td>{{ row.email }}</td>
    <td>{{ row.role }}</td>
  </tr>
}
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
