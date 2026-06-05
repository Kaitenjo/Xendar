_render() {
  let unwatchFns = [];
  const label0 = document.createElement("label");
  unwatchFns.push(effect(() => label0.setAttribute('for', this.id)));
  unwatchFns.push(effect(() => label0.setAttribute('aria-label', this.label)));
  unwatchFns.push(effect(() => label0.setAttribute('placeholder', this.placeholder)));
  label0.addEventListener("input", ($event) => this.onInput($event));
  this._root.appendChild(label0);
  unwatchFns.push(() => this._root.removeChild(label0));
  const label0_text0 = document.createTextNode(this.label);
  label0.appendChild(label0_text0);
  unwatchFns.push(effect(() => label0_text0.textContent = this.label));
  const test = this.user.name;
  (() => {
    let state;
    let localUnwatchFns = []
    const checkAndUpdateState = (newState, fn) => {
      if (state === newState) {
        return;
      }
      state = newState;
      unwatch();
      localUnwatchFns = Signal.subtle.untrack(fn);
      unwatchFns.push(...localUnwatchFns);
    };
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
      localUnwatchFns = [];
    }
    unwatchFns.push(
      effect(() => {
        if ((this.a || this.b) && this.c || this.id !== 'boolean' || this.pippo instanceof HTMLElement || this.id && this.id.length > 0) {
          checkAndUpdateState(0, this.if_2.bind(this));
        } else if (true) {
          checkAndUpdateState(1, this.elseIf_2_0.bind(this));
        } else {
          checkAndUpdateState(2, this.else_2.bind(this));
        }
      })
    );
  })();
  (() => {
    let state;
    let localUnwatchFns = []
    const checkAndUpdateState = (newState, fn) => {
      if (state === newState) {
        return;
      }
      state = newState;
      unwatch();
      localUnwatchFns = Signal.subtle.untrack(fn);
      unwatchFns.push(...localUnwatchFns);
    };
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
      localUnwatchFns = [];
    }
    unwatchFns.push(
      effect(() => {
        if (this.val.get() === 'Password') {
          checkAndUpdateState(0, this.if_3.bind(this));
        } else if (this.val.get() === 'Password') {
          checkAndUpdateState(1, this.elseIf_3_0.bind(this));
        } else {
          checkAndUpdateState(2, this.else_3.bind(this));
        }
      })
    );
  })();
  (() => {
    let localUnwatchFns = [];
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      localUnwatchFns = [];
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
    };
    unwatchFns.push(
      effect(() => {
        unwatch();
        const items4 = this.items;
        Signal.subtle.untrack(() => {
          for (let i4 = 0; i4 < items4.length; i4++) {
            localUnwatchFns.push(...this.for_4(i4));
            unwatchFns.push(...localUnwatchFns);
          }
        });
      })
    );
  })();
  (() => {
    let localUnwatchFns = []
    const checkAndUpdateState = (newState, fn) => {
      unwatch();
      localUnwatchFns = Signal.subtle.untrack(fn);
      unwatchFns.push(...localUnwatchFns);
    };
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
      localUnwatchFns = [];
    }
    unwatchFns.push(
      effect(() => {
        unwatch();
        switch (this.status) {
          case 'loading':
          case 'error': {
            localUnwatchFns = Signal.subtle.untrack(this.case_5_0.bind(this));
            unwatchFns.push(...localUnwatchFns);
            break;
          }
          default: {
            localUnwatchFns = Signal.subtle.untrack(this.default_5.bind(this));
            unwatchFns.push(...localUnwatchFns);
            break;
          }
        }
      })
    );
  })();
  (() => {
    let localUnwatchFns = []
    const checkAndUpdateState = (newState, fn) => {
      unwatch();
      localUnwatchFns = Signal.subtle.untrack(fn);
      unwatchFns.push(...localUnwatchFns);
    };
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
      localUnwatchFns = [];
    }
    unwatchFns.push(
      effect(() => {
        unwatch();
        switch (this.status) {
          case 'loading': {
            localUnwatchFns = Signal.subtle.untrack(this.case_6_0.bind(this));
            unwatchFns.push(...localUnwatchFns);
            break;
          }
          case 'error': {
            localUnwatchFns = Signal.subtle.untrack(this.case_6_1.bind(this));
            unwatchFns.push(...localUnwatchFns);
            break;
          }
          default: {
            localUnwatchFns = Signal.subtle.untrack(this.default_6.bind(this));
            unwatchFns.push(...localUnwatchFns);
            break;
          }
        }
      })
    );
  })();
  const input7 = document.createElement("input");
  unwatchFns.push(effect(() => input7.setAttribute('id', this.id)));
  input7.setAttribute('type', "text");
  unwatchFns.push(effect(() => input7.setAttribute('value', this.value + '' + 'asd' + ' ' + "test" )));
  unwatchFns.push(effect(() => input7.setAttribute('placeholder', this.placeholder)));
  input7.addEventListener("change", ($event) => this.onChange($event));
  this._root.appendChild(input7);
  unwatchFns.push(() => this._root.removeChild(input7));
  return unwatchFns;
}
if_2_1_1() {
  let unwatchFns = [];
  const test2 = this.user.name;
  const test3 = this.user.name;
  const span2_1_1_2 = document.createElement("span");
  this._root.appendChild(span2_1_1_2);
  unwatchFns.push(() => this._root.removeChild(span2_1_1_2));
  const span2_1_1_2_text0 = document.createTextNode("Id is present");
  span2_1_1_2.appendChild(span2_1_1_2_text0);
  unwatchFns.push(effect(() => span2_1_1_2_text0.textContent = "Id is present"));
  return unwatchFns;
}
else_2_1_1() {
  let unwatchFns = [];
  const span2_1_1_0 = document.createElement("span");
  this._root.appendChild(span2_1_1_0);
  unwatchFns.push(() => this._root.removeChild(span2_1_1_0));
  const span2_1_1_0_text0 = document.createTextNode("Id is missing");
  span2_1_1_0.appendChild(span2_1_1_0_text0);
  unwatchFns.push(effect(() => span2_1_1_0_text0.textContent = "Id is missing"));
  return unwatchFns;
}
if_2_1() {
  let unwatchFns = [];
  const test2 = this.user.name;
  const test3 = this.user.name;
  const span2_1_2 = document.createElement("span");
  this._root.appendChild(span2_1_2);
  unwatchFns.push(() => this._root.removeChild(span2_1_2));
  const span2_1_2_text0 = document.createTextNode("Id is present");
  span2_1_2.appendChild(span2_1_2_text0);
  unwatchFns.push(effect(() => span2_1_2_text0.textContent = "Id is present"));
  return unwatchFns;
}
else_2_1() {
  let unwatchFns = [];
  const span2_1_0 = document.createElement("span");
  this._root.appendChild(span2_1_0);
  unwatchFns.push(() => this._root.removeChild(span2_1_0));
  const span2_1_0_text0 = document.createTextNode("Id is missing");
  span2_1_0.appendChild(span2_1_0_text0);
  unwatchFns.push(effect(() => span2_1_0_text0.textContent = "Id is missing"));
  (() => {
    let state;
    let localUnwatchFns = []
    const checkAndUpdateState = (newState, fn) => {
      if (state === newState) {
        return;
      }
      state = newState;
      unwatch();
      localUnwatchFns = Signal.subtle.untrack(fn);
      unwatchFns.push(...localUnwatchFns);
    };
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
      localUnwatchFns = [];
    }
    unwatchFns.push(
      effect(() => {
        if ((this.a || this.b) && this.c || this.id !== 'boolean' || this.pippo instanceof HTMLElement || this.id && this.id.length > 0) {
          checkAndUpdateState(0, this.if_2_1_1.bind(this));
        } else {
          checkAndUpdateState(1, this.else_2_1_1.bind(this));
        }
      })
    );
  })();
  return unwatchFns;
}
if_2() {
  let unwatchFns = [];
  const test2 = this.user.name;
  const test3 = this.user.name;
  const span2_2 = document.createElement("span");
  this._root.appendChild(span2_2);
  unwatchFns.push(() => this._root.removeChild(span2_2));
  const span2_2_text0 = document.createTextNode("Id is present");
  span2_2.appendChild(span2_2_text0);
  unwatchFns.push(effect(() => span2_2_text0.textContent = "Id is present"));
  return unwatchFns;
}
elseIf_2_0() {
  let unwatchFns = [];
  const span2_0 = document.createElement("span");
  this._root.appendChild(span2_0);
  unwatchFns.push(() => this._root.removeChild(span2_0));
  const span2_0_text0 = document.createTextNode("Id is missing");
  span2_0.appendChild(span2_0_text0);
  unwatchFns.push(effect(() => span2_0_text0.textContent = "Id is missing"));
  (() => {
    let state;
    let localUnwatchFns = []
    const checkAndUpdateState = (newState, fn) => {
      if (state === newState) {
        return;
      }
      state = newState;
      unwatch();
      localUnwatchFns = Signal.subtle.untrack(fn);
      unwatchFns.push(...localUnwatchFns);
    };
    const unwatch = () => {
      localUnwatchFns?.forEach(fn => fn());
      unwatchFns = unwatchFns.filter(fn => !localUnwatchFns.includes(fn));
      localUnwatchFns = [];
    }
    unwatchFns.push(
      effect(() => {
        if ((this.a || this.b) && this.c || this.id !== 'boolean' || this.pippo instanceof HTMLElement || this.id && this.id.length > 0) {
          checkAndUpdateState(0, this.if_2_1.bind(this));
        } else {
          checkAndUpdateState(1, this.else_2_1.bind(this));
        }
      })
    );
  })();
  return unwatchFns;
}
else_2() {
  let unwatchFns = [];
  const span2_0 = document.createElement("span");
  this._root.appendChild(span2_0);
  unwatchFns.push(() => this._root.removeChild(span2_0));
  const span2_0_text0 = document.createTextNode("Id is missing");
  span2_0.appendChild(span2_0_text0);
  unwatchFns.push(effect(() => span2_0_text0.textContent = "Id is missing"));
  return unwatchFns;
}
if_3() {
  let unwatchFns = [];
  const button3_0 = document.createElement("button");
  button3_0.addEventListener("click", ($event) => this.togglePasswordVisibility());
  this._root.appendChild(button3_0);
  unwatchFns.push(() => this._root.removeChild(button3_0));
  const button3_0_text0 = document.createTextNode("Toggle Password Visibility");
  button3_0.appendChild(button3_0_text0);
  unwatchFns.push(effect(() => button3_0_text0.textContent = "Toggle Password Visibility"));
  return unwatchFns;
}
elseIf_3_0() {
  let unwatchFns = [];
  const button3_0 = document.createElement("button");
  button3_0.addEventListener("click", ($event) => this.togglePasswordVisibility());
  this._root.appendChild(button3_0);
  unwatchFns.push(() => this._root.removeChild(button3_0));
  const button3_0_text0 = document.createTextNode("Toggle Password Visibility");
  button3_0.appendChild(button3_0_text0);
  unwatchFns.push(effect(() => button3_0_text0.textContent = "Toggle Password Visibility"));
  return unwatchFns;
}
else_3() {
  let unwatchFns = [];
  const button3_0 = document.createElement("button");
  button3_0.addEventListener("click", ($event) => this.clearInput());
  this._root.appendChild(button3_0);
  unwatchFns.push(() => this._root.removeChild(button3_0));
  const button3_0_text0 = document.createTextNode("Clear");
  button3_0.appendChild(button3_0_text0);
  unwatchFns.push(effect(() => button3_0_text0.textContent = "Clear"));
  return unwatchFns;
}
for_4(i4) {
  let unwatchFns = [];
  const item = items4[i4];
  const i = i4;
  const $first = i4 === 0;
  const $last = i4 === items4.length - 1;
  const $even = i4 % 2 === 0;
  const $odd = !$even;
    const test3 = this.user.name;
    const div4_1 = document.createElement("div");
    this._root.appendChild(div4_1);
    unwatchFns.push(() => this._root.removeChild(div4_1));
    const div4_1_text0 = document.createTextNode(item);
    div4_1.appendChild(div4_1_text0);
    unwatchFns.push(effect(() => div4_1_text0.textContent = item));
  return unwatchFns;
}
case_5_0() {
  let unwatchFns = [];
  const div5_0_0 = document.createElement("div");
  this._root.appendChild(div5_0_0);
  unwatchFns.push(() => this._root.removeChild(div5_0_0));
  const div5_0_0_text0 = document.createTextNode("Loading...");
  div5_0_0.appendChild(div5_0_0_text0);
  unwatchFns.push(effect(() => div5_0_0_text0.textContent = "Loading..."));
  return unwatchFns;
}
default_5() {
  let unwatchFns = [];
  const div5_0_0 = document.createElement("div");
  this._root.appendChild(div5_0_0);
  unwatchFns.push(() => this._root.removeChild(div5_0_0));
  const div5_0_0_text0 = document.createTextNode("Content");
  div5_0_0.appendChild(div5_0_0_text0);
  unwatchFns.push(effect(() => div5_0_0_text0.textContent = "Content"));
  return unwatchFns;
}
case_6_0() {
  let unwatchFns = [];
  const div6_0_0 = document.createElement("div");
  this._root.appendChild(div6_0_0);
  unwatchFns.push(() => this._root.removeChild(div6_0_0));
  const div6_0_0_text0 = document.createTextNode("Loading...");
  div6_0_0.appendChild(div6_0_0_text0);
  unwatchFns.push(effect(() => div6_0_0_text0.textContent = "Loading..."));
  return unwatchFns;
}
case_6_1() {
  let unwatchFns = [];
  const div6_0_0 = document.createElement("div");
  this._root.appendChild(div6_0_0);
  unwatchFns.push(() => this._root.removeChild(div6_0_0));
  const div6_0_0_text0 = document.createTextNode("Error!");
  div6_0_0.appendChild(div6_0_0_text0);
  unwatchFns.push(effect(() => div6_0_0_text0.textContent = "Error!"));
  return unwatchFns;
}
default_6() {
  let unwatchFns = [];
  const div6_0_0 = document.createElement("div");
  this._root.appendChild(div6_0_0);
  unwatchFns.push(() => this._root.removeChild(div6_0_0));
  const div6_0_0_text0 = document.createTextNode("Content");
  div6_0_0.appendChild(div6_0_0_text0);
  unwatchFns.push(effect(() => div6_0_0_text0.textContent = "Content"));
  return unwatchFns;
}