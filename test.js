_render() {
  let unwatchFns = [];
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
        const items0 = this.items.get();
        Signal.subtle.untrack(() => {
          for (let i0 = 0; i0 < items0.length; i0++) {
            localUnwatchFns.push(...this.for_0(items0, i0));
            unwatchFns.push(...localUnwatchFns);
          }
        });
      })
    );
  })();
  return unwatchFns;
}
for_0(items0, i0) {
  let unwatchFns = [];
  const item = items0[i0];
  const $index = i0;
  const $first = i0 === 0;
  const $last = i0 === items0.length - 1;
  const $even = i0 % 2 === 0;
  const $odd = !$even;
  const span0_0 = document.createElement("span");
  this._root.appendChild(span0_0);
  unwatchFns.push(() => this._root.removeChild(span0_0));
  const span0_0_text0 = document.createTextNode(item.name);
  span0_0.appendChild(span0_0_text0);
  unwatchFns.push(effect(() => span0_0_text0.textContent = item.name));
  return unwatchFns;
}