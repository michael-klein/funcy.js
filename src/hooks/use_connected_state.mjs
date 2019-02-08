"use strict";
import { createHook } from "../../node_modules/hookuspocus/src/index.mjs";

export const useConnectedState = createHook(
  "useConnectedState",
  ({ getContext }) => {
    const element = getContext();
    return element._isConnected;
  }
);
