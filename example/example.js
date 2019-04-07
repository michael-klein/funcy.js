import {
  component,
  useRenderer,
  useState,
  useAttribute,
  useProp
} from "../dist/index.esm.js";
import {
  html,
  render
} from "https://unpkg.com/@pikapkg/lit-html@0.13.0-pre.2/dist-bundled/index.js";

function useLitHTML() {
  useRenderer((view, shadowRoot) => {
    render(view, shadowRoot);
  });
  return html;
}

component("example-component", () => {
  const html = useLitHTML();
  const [count, setCount] = useState(0);
  const [attr] = useAttribute("test", "toast");
  const [foo, setFoo] = useState("bar");
  return html`
    <div>
      <h1>Hello World!</h1>
      <button @click=${() => setCount(count + 1) && console.log("click")}>
        + increment
      </button>
      <div>count: ${count}</div>
      <div>${attr}</div>
      <div>
        <input type="text" value=${foo} @input=${e => setFoo(e.target.value)}/>
        <example-component2 .foo=${foo}></example-component2>
      </div>
    </div>
  `;
});
component("example-component2", () => {
  const html = useLitHTML();
  const [prop] = useProp("foo");
  return html`
    <div>
      prop: ${prop}
    </div>
  `;
});
