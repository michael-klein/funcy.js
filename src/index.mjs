import { queueRender, defaultRenderer } from "./renderer.mjs";
export { useReducer, useState, usePreactHtm } from "./hooks.mjs";
const componentMap = new Map();
function addComponent(name) {
  class Component extends HTMLElement {
    constructor() {
      super();
      this.renderer = defaultRenderer;
    }
    connectedCallback() {
      if (!this._shadowRoot) {
        this._shadowRoot = this.attachShadow({ mode: "open" });
        queueRender(this);
      }
    }
    render() {
      this._shadowRoot.innerHTML = "";
      const view = componentMap.get(name)();
      this.renderer(view, this._shadowRoot);
    }
  }

  try {
    customElements.define(name, Component);
  } catch (e) {
    console.warn(`Component ${name} was already defined.`);
  }
}
export const defineComponent = (name, component) => {
  if (!componentMap.has(name)) {
    componentMap.set(name, component);
    addComponent(name);
  } else {
    console.warn(`Component ${name} was already defined.`);
  }
};
