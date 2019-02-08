"use strict";
import { createHook } from "../../node_modules/hookuspocus/src/index.mjs";

export const useShadowRoot = createHook("useShadowRoot", ({ getContext }) => {
  return getContext()._shadowRoot;
});
