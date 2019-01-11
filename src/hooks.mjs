import {
  getCurrentElement,
  getCurrentHookState,
  queueRender,
  queueAfterRender,
  nextHook
} from "./renderer.mjs";
export const createHook = hook => (...args) => {
  nextHook();
  return hook(...args);
};
export const useReducer = createHook((reducer, initialState) => {
  const hookState = getCurrentHookState({
    reducer,
    state: initialState
  });
  const element = getCurrentElement();
  return [
    hookState.state,
    action => {
      hookState.state = hookState.reducer(hookState.state, action);
      queueRender(element);
    }
  ];
});
export const useState = createHook(initialState => {
  const [state, dispatch] = useReducer((_, action) => {
    return action.value;
  }, initialState);

  return [
    state,
    newState =>
      dispatch({
        type: "set_state",
        value: newState
      })
  ];
});
export const useRenderer = createHook(rendererIn => {
  const renderer = getCurrentHookState(rendererIn);
  const element = getCurrentElement();
  element.renderer = renderer;
});

import { html, render } from "https://unpkg.com/htm/preact/standalone.mjs";
export const usePreactHtm = createHook(() => {
  useRenderer((view, shadowRoot) => {
    render(view, shadowRoot);
  });
  return [html];
});
export const useEffect = createHook((effect, values) => {
  const state = getCurrentHookState({
    effect,
    values,
    cleanUp: () => {}
  });
  let nothingChanged = false;
  if (state.values !== values && state.values && state.values.length > 0) {
    nothingChanged = true;
    let index = state.values.length;

    while (index--) {
      if (values[index] !== state.values[index]) {
        nothingChanged = false;
        break;
      }
    }
    state.values = values;
  }
  if (!nothingChanged) {
    state.cleanUp();
    queueAfterRender(() => {
      const cleanUp = state.effect();
      if (cleanUp) {
        state.cleanUp = cleanUp;
      }
    });
  }
});
export const useAttribute = createHook(attributeName => {
  const element = getCurrentElement();
  const attributeValue = element.getAttribute(attributeName);
  return [
    attributeValue,
    value => {
      element.skipQueue = true;
      element.setAttribute(attributeName, value);
    }
  ];
});
export const useCSS = createHook((parts, ...slots) => {
  let styles;
  if (parts instanceof Array) {
    styles = parts
      .map((part, index) => {
        if (slots[index]) {
          return part + slots[index];
        } else {
          return part;
        }
      })
      .join("");
  } else {
    styles = parts;
  }
  styles = styles.replace(/ +(?= )/g, "").replace(/\n/g, "");
  const element = getCurrentElement();
  const style = document.createElement("style");
  style.innerHTML = styles;
  useEffect(() => {
    element._shadowRoot.appendChild(style);
    return () => {
      element._shadowRoot.removeChild(style);
    };
  });
});
export const useExposeMethod = createHook((name, method) => {
  const element = getCurrentElement();
  element[name] = (...args) => method(...args);
});
