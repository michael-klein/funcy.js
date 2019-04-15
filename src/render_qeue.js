import { on, useReducer } from "../node_modules/hookuspocus/src/index";
window.___funcyJsRenderQueue;
const createRenderPromise = component => {
  const promise = new Promise(resolve => resolve(component.render())).then(
    _ => {
      if ((window.___funcyJsRenderQueue = promise)) {
        window.___funcyJsRenderQueue = undefined;
      }
    }
  );
};
export const queueRender = component => {
  if (!window.___funcyJsRenderQueue) {
    window.___funcyJsRenderQueue = createRenderPromise(component);
  } else {
    window.___funcyJsRenderQueue.then(() => createRenderPromise(component));
  }
};
on(useReducer, (data, reducer, initialArg, init) => {
  const [state, dispatch] = data.hook(data, reducer, initialArg, init);
  return [
    state,
    action => {
      const result = dispatch(action);
      if (state !== result) {
        queueRender(data.context);
      }
      return result;
    }
  ];
});
