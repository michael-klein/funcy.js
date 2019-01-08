import {
  getCurrentElement,
  getCurrentHookState,
  queueRender,
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
export const useRenderer = createHook(renderer => {
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
