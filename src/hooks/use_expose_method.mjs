"use strict";
import { createHook } from "../../node_modules/hookuspocus/src/index.mjs";
export const useExposeMethod = createHook(
  "useExposeMethod",
  (name, method, { getContext }) => {
    const element = getContext();
    element[name] = (...args) => method(...args);
  }
);
