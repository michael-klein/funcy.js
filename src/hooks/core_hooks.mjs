import {
  useEffect,
  createHook
} from "../../node_modules/hookuspocus/src/index.mjs";

export const useHostElement = createHook("useHostElement", ({ getContext }) => {
  return getContext();
});
export const useShadowRoot = createHook("useShadowRoot", ({ getContext }) => {
  return getContext()._shadowRoot;
});
export const useRenderer = createHook(
  "useRenderer",
  (rendererIn, { getContext, getState }) => {
    const renderer = getState(rendererIn);
    getContext()._renderer = renderer;
  }
);
export const useAttribute = createHook(
  "useAttribute",
  (attributeName, { getContext }) => {
    const element = getContext();
    const attributeValue = element.getAttribute(attributeName);
    return [
      attributeValue,
      value => {
        element.skipQueue = true;
        element.setAttribute(attributeName, value);
      }
    ];
  }
);
export const useCSS = createHook("useCSS", (parts, ...slots) => {
  let styles;
  slots.pop();
  if (parts instanceof Array) {
    styles = parts
      .map((part, index) => {
        if (slots[index]) {
          return part + slots[index];
        } else {
          return part;
        }
      })
      .join("");
  } else {
    styles = parts;
  }
  styles = styles.replace(/ +(?= )/g, "").replace(/\n/g, "");
  const shadowRoot = useShadowRoot();
  const style = document.createElement("style");
  style.innerHTML = styles;
  useEffect(() => {
    shadowRoot.appendChild(style);
    return () => {
      shadowRoot.removeChild(style);
    };
  });
});
export const useExposeMethod = createHook(
  "useExposeMethod",
  (name, method, { getContext }) => {
    const element = getContext();
    element[name] = (...args) => method(...args);
  }
);
export const useConnectedState = createHook(
  "useConnectedState",
  ({ getContext }) => {
    const element = getContext();
    return element._isConnected;
  }
);
