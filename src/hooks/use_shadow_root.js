"use strict";
import { createHook } from "../../node_modules/hookuspocus/dist-src/index.js";

export const useShadowRoot = createHook("useShadowRoot", ({ getContext }) => {
  return getContext()._shadowRoot;
});
