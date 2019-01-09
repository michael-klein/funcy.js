import { queueRender, defaultRenderer, getPassableProps } from "./renderer.mjs";
export {
  useReducer,
  useState,
  usePreactHtm,
  useEffect,
  usePassProps,
  useAttribute
} from "./hooks.mjs";
const componentMap = new Map();
function addComponent(name, options) {
  class Component extends HTMLElement {
    constructor() {
      super();
      this.props = {};
      this.renderer = defaultRenderer;
    }
    connectedCallback() {
      if (!this._shadowRoot) {
        this._shadowRoot = this.attachShadow({ mode: "open" });
        queueRender(this);
      }
    }
    render() {
      const propsId = this.getAttribute("data-props");
      if (propsId) {
        this.props = getPassableProps(propsId);
        this.skipQueue = true;
        this.removeAttribute("data-props");
      }
      const view = componentMap.get(name)(this.props);
      this.renderer(view, this._shadowRoot);
    }
    attributeChangedCallback(attrName, oldVal, newVal) {
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
  console.log(name);
  if (!componentMap.has(name)) {
    componentMap.set(name, component);
    addComponent(name, options);
  } else {
    console.warn(`Component ${name} was already defined.`);
  }
};
