"use strict";
import { hookus, useState } from "../../node_modules/hookuspocus/src/index";
import { queueRender } from "../render_qeue";

export const useProp = hookus((data, name, initialValue) => {
  const element = data.context;
  let setProp = data.v;
  if (!setProp) {
    let paused = false;
    if (element[name] === undefined || element.hasOwnProperty(name)) {
      let val = element[name] || initialValue;
      Object.defineProperty(element, name, {
        set: value => {
          if (val !== value) {
            val = value;
            if (!paused) {
              queueRender(element);
            }
          }
        },
        get: () => val
      });
    }
    setProp = value => {
      paused = true;
      element[name] = value;
      paused = false;
    };
    if (element[name] === undefined) {
      setProp(initialValue);
    }
    data.v = setProp;
  }
  return [element[name], setProp];
});
