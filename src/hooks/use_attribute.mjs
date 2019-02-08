"use strict";
import { createHook } from "../../node_modules/hookuspocus/src/index.mjs";

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
