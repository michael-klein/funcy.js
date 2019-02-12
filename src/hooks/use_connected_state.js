"use strict";
import { createHook } from "../../node_modules/hookuspocus/dist-src/index.js";

export const useConnectedState = createHook(
  "useConnectedState",
  ({ getContext }) => {
    const element = getContext();
    return element._isConnected;
  }
);
