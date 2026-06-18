import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  <label style="width: 100%; height: 50px;" for="{id}" aria-label="{label}" @input="onInput($event)">
    {label}
  </label>
  @const test = user.name;
  
  @if (isChecked) {
    <span>Checked</span>
  }

  @if (!isChecked) {
    <span>Unchecked</span>
  }

  @if ((a || b) && c || id !== 'boolean' || pippo instanceof HTMLElement || id && id.length > 0) {
    @const test2 = user.name;
    @const test3 = user.name;
    <span>Id is present</span>
  } @else if (true) {
    <span>Id is missing</span>
    @if ((a || b) && c || id !== 'boolean' || pippo instanceof HTMLElement || id && id.length > 0) {
      @const test2 = user.name;
      @const test3 = user.name;
      <span>Id is present</span>
    } @else {
      <span>Id is missing</span>
      @if ((a || b) && c || id !== 'boolean' || pippo instanceof HTMLElement || id && id.length > 0) {
        @const test2 = user.name;
        @const test3 = user.name;
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

  @for (item of items; track item.id; $index = i) {
    @const test3 = user.name;
    <div>{item}</div>
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
  <input id="{id}" type="text" value="{ value + '' + 'asd' + ' ' + "test" }" placeholder="{placeholder}" @change="onChange($event)" />
  @if (a) {
    <div>
      @if (b) {
        <span>Nested if</span>
      }
    </div>
  }
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
