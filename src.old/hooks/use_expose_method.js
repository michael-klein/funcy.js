"use strict";
import { createHook } from "../../node_modules/hookuspocus/dist-src/index.js";
export const useExposeMethod = createHook(
  "useExposeMethod",
  (name, method, { getContext }) => {
    const element = getContext();
    element[name] = (...args) => method(...args);
  }
);
