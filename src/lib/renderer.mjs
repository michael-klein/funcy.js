"use strict";
import { run } from "../../node_modules/hookuspocus/src/index.mjs";
const passPropsMap = new Map();
let rendering = false;
const renderQueue = [];
const render = element => {
  return run({
    context: element,
    onStateChange: (name, state, oldState) => {
      console.log(name, state, oldState);
    },
    function: () => element.render(),
    onStateChange: name => {
      if (name === "useReducer") {
        queueRender(element);
      }
    }
  });
};
const unqeue = async () => {
  const length = renderQueue.length;
  rendering = true;
  Promise.resolve().then(async () => {
    let index = length;
    while (index--) {
      await render(renderQueue[length - index - 1]);
    }
    renderQueue.splice(0, length);
    rendering = false;
    if (renderQueue.length > 0) unqeue();
  });
};
export const queueRender = (element, force) => {
  if (
    (renderQueue.indexOf(element) === -1 && element._isConnected === true) ||
    force
  ) {
    renderQueue.push(element);
  }
  if (!rendering) {
    unqeue();
  }
};
export const getPassableProps = id => {
  const props = passPropsMap.get(id);
  passPropsMap.delete(id);
  return props;
};
let passPropsId = 100000;
export const addPassableProps = props => {
  let id = passPropsId.toString(16);
  passPropsId++;
  if (id.length % 2) {
    id = "0" + id;
  }
  passPropsMap.set(id, props);
  return id;
};
export const prps = props => {
  let id = addPassableProps(props);
  return {
    "data-props": id
  };
};
export const defaultRenderer = (view, shadowRoot) => {
  if (
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
};
