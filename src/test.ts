import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `

    @for (item of navItems(); track item.route) {
      <a class="{ collapsed() ? 'sidebar__link sidebar__link--collapsed' : 'sidebar__link' }" title="{item.label}" />
    }
  `

const filePath = 'dist/compiled.js'
const output = compile(template, 'TestComponent').then(output => {
  writeFileSync(filePath, output.javascript);
  writeFileSync('dist/compiled.ts', output.typescript);
});
