"use strict";
import { hookus } from "../../node_modules/hookuspocus/src/index";

export const useHostElement = hookus(data => {
  return data.context;
});
