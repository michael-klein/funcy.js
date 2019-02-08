"use strict";
import { createHook } from "../../node_modules/hookuspocus/src/index.mjs";

export const useRenderer = createHook(
  "useRenderer",
  (rendererIn, { getContext, getState }) => {
    const renderer = getState(rendererIn);
    getContext()._renderer = renderer;
  }
);
