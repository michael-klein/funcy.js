import { pocus } from "../node_modules/hookuspocus/src/index";
import { queueRender } from "./render_qeue";
export function component(name, comp, options) {
  class Component extends HTMLElement {
    constructor() {
      super();
      if (!this.shadowRoot) {
        this.attachShadow(
          Object.assign(
            {
              mode: "open"
            },
            options
          )
        );
      }
      queueRender(this);
    }
    renderer(view, shadowRoot) {
      if (
        view &&
        !(view instanceof NodeList
          ? shadowRoot.contains(view[0])
          : shadowRoot.contains(view))
      ) {
        shadowRoot.innerHTML = "";
        if (view instanceof NodeList) {
          view.forEach(node => shadowRoot.appendChild(node));
        } else {
          shadowRoot.appendChild(view);
        }
      }
    }
    render() {
      const view = pocus(comp, this);
      return this.renderer(view, this.shadowRoot);
    }
  }
  customElements.define(name, Component);
}
