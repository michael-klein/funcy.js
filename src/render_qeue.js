import { on, useReducer } from "../node_modules/hookuspocus/src/index";
const queue = [];
let rendering = false;
let renderStart;
const unqeue = async () => {
  if (!rendering && queue.length > 0) {
    renderStart = renderStart || Date.now();
    rendering = true;
    const component = queue.pop();
    await component.render();
    const next = () => {
      rendering = false;
      unqeue();
    };
    if (Date.now() - renderStart > 66) {
      requestAnimationFrame(next);
    } else {
      next();
    }
  }
};
export const queueRender = component => {
  if (queue.indexOf(component) === -1) {
    queue.push(component);
  }
  unqeue();
};
on(useReducer, (data, reducer, initialArg, init) => {
  const [state, dispatch] = data.hook(data, reducer, initialArg, init);
  return [
    state,
    action => {
      const result = dispatch(action);
      if (state !== result) {
        queueRender(data.context)
      }
      return result;
    }
  ];
});
