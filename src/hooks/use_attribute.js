"use strict";
import { createHook } from "../../node_modules/hookuspocus/dist-src/index.js";

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
