"use strict";
import { queueRender, defaultRenderer, getPassableProps } from "./renderer.js";
import {
  dispose,
  hookus
} from "../../node_modules/hookuspocus/dist-src/index.js";
export { prps } from "./renderer.js";
const componentMap = new Map();
function addComponent(name, options = {}) {
  class Component extends HTMLElement {
    constructor() {
      super();
      this._props = {};
      this._renderer = defaultRenderer;
      this._isConnected = false;
      hookus(this, (name, value, oldValue) => {
        if (name === "useReducer" && value !== oldValue) {
          queueRender(element);
        }
      });
    }
    connectedCallback() {
      if (!this._shadowRoot) {
        this._shadowRoot = this.attachShadow({
          mode: "open",
          ...(options.shadowOptions ? options.shadowOptions : {})
        });
      }
      if (!this._isConnected) {
        this._isConnected = true;
        queueRender(this);
      }
    }
    disconnectedCallback() {
      if (this._isConnected) {
        this._isConnected = false;
        queueRender(this);
      }
    }
    destroy() {
      this.parentElement.removeChild(this);
      dispose(this);
    }
    async render() {
      const propsId = this.getAttribute("data-props");
      if (propsId) {
        this._props = getPassableProps(propsId);
        this.skipQueue = true;
        this.removeAttribute("data-props");
      }
      const view = await Promise.resolve().then(() =>
        componentMap.get(name)(this._props)
      );
      await this._renderer(view, this._shadowRoot);
      this.init = false;
    }
    attributeChangedCallback(attrName, oldVal, newVal) {
      if (this.init) {
        return;
      }
      if (!this.skipQueue && oldVal !== newVal) {
        queueRender(this);
      }
      this.skipQueue = false;
    }
    static get observedAttributes() {
      let observedAttributes = ["data-props"];
      if (options.observedAttributes) {
        observedAttributes = observedAttributes.concat(
          options.observedAttributes
        );
      }
      return observedAttributes;
    }
  }
  customElements.define(name, Component);
}
export const defineComponent = (name, component, options = {}) => {
  if (!componentMap.has(name)) {
    componentMap.set(name, component);
    addComponent(name, options);
  } else {
    console.warn(`Component ${name} was already defined.`);
  }
};
