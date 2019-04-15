import {
  component,
  useRenderer,
  useHostElement,
  useState
} from "../../dist/index.esm.js";
import * as goober from "../goober/goober.mjs";
import { html, render } from "../lit-html/lit_html.js";
import { reset } from "../reset.js";

export function funcyComponent(name, componentIn) {
  component(name, () => {
    const shadowRoot = useHostElement().shadowRoot;
    const [css] = useState(goober.css.bind({ target: shadowRoot }));
    const [root] = useState(document.createElement("root"));
    if (!root.parentNode) {
      shadowRoot.appendChild(root);
      root.classList.add(css`
        ${reset}
      `);
    }
    useRenderer(view => {
      render(view, root);
    });
    return html`
      ${componentIn(html, css)}
    `;
  });
}
