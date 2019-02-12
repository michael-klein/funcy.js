"use strict";
import {
  createHook,
  useEffect
} from "../../node_modules/hookuspocus/dist-src/index.js";

export const useCSS = createHook("useCSS", (parts, ...slots) => {
  const { getContext } = slots.pop();
  let styles;
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
  const shadowRoot = getContext()._shadowRoot;
  const style = document.createElement("style");
  style.innerHTML = styles;
  useEffect(() => {
    shadowRoot.appendChild(style);
    return () => {
      shadowRoot.removeChild(style);
    };
  });
});
