import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
@import { SidebarComponent } from '../sidebar/sidebar.xd.component.ts'
@import { TopbarComponent } from '../topbar/topbar.xd.component.ts'

<div class="shell">
  <app-sidebar collapsed="{sidebarCollapsed()}" @collapsedChange="onCollapseChange($event)" />

  <div class="shell__main">
    <app-topbar @menuToggle ="onSidebarToggle()" />

    <main class="shell__content" />
  </div>
</div>
`

const filePath = 'dist/compiled.js'
compile(template, 'TestComponent').then(output => {
  writeFileSync(filePath, output.javascript);
  writeFileSync('dist/compiled.ts', output.typescript);
}).catch(err => console.error(`Failed to compile template:\n${String(err)}`));
