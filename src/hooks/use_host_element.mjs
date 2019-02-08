"use strict";
import { createHook } from "../../node_modules/hookuspocus/src/index.mjs";

export const useHostElement = createHook("useHostElement", ({ getContext }) => {
  return getContext();
});
