import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  {\`$\{pippo} cazzo\`}
  <div  attribute="{\`$\{pippo} cazzo\`}"  value="{ value + '' + 'asd' + ' ' + "test" }" dick="{\`$\{value}asd $\{test}\`}" @click="onClick()" @click="onClick($event)" @click="onClick($event, cazzo, 'figa')" @click="onClick('palle', cazzo, 'figa')" />

  @if ((a || b) && c || id !== 'boolean' || pippo instanceof HTMLElement || id && id.length > 0) {
    <span>Id is present</span>
  } @else if (true) {
    <span>Id is missing</span>
    @if ((a || b) && c || id !== 'boolean' || pippo instanceof HTMLElement || id && id.length > 0) {
      <span>Id is present</span>
    } @else {
      <span>Id is missing</span>
      @if ((a || b) && c || id !== 'boolean' || pippo instanceof HTMLElement || id && id.length > 0) {
        <span>Id is present</span>
      } @else {
        <span>Id is missing</span>
      }
    }
  } @else {
    <span>Id is missing</span>
  }
  
  @if (val.get() === 'Password') {
    <button @click="togglePasswordVisibility()">Toggle Password Visibility</button>
  } @else if (val.get() === 'Password') {
    <button @click="togglePasswordVisibility()">Toggle Password Visibility</button>
  } @else {
    <button @click="clearInput()">Clear</button>
  }

  @switch (status) {
    @case ('loading')
    @case ('error') {
      <div>Loading...</div>
    }
    
    @default {
      <div>Content</div>
    }
  }

  @switch (status) {
    @case ('loading') {
      <div>Loading...</div>
    }
    
    @case ('error') {
      <div>Error!</div>
    }
    
    @default {
      <div>Content</div>
    }
  }

  @for (x of children; track x.cazzo) {
  
  }
  `

const filePath = 'dist/compiled.js'
const output = compile(template, 'TestComponent');
writeFileSync(filePath, output.javascript);
writeFileSync('dist/compiled.ts', output.typescript);
