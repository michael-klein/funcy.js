"use strict";
import { createHook } from "../../node_modules/hookuspocus/dist-src/index.js";

export const useHostElement = createHook("useHostElement", ({ getContext }) => {
  return getContext();
});
