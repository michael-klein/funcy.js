"use strict";
import { createHook } from "../../node_modules/hookuspocus/dist-src/index.js";

export const useRenderer = createHook(
  "useRenderer",
  (rendererIn, { getContext, getState }) => {
    const renderer = getState(rendererIn);
    getContext()._renderer = renderer;
  }
);
