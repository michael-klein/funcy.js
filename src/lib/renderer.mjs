let currentElement;
let currentHookStateIndex = undefined;
const hookStateMap = new Map();
const passPropsMap = new Map();
let rendering = false;
const renderQueue = [];
const afterRenderQueue = [];
const render = element => {
  currentElement = element;
  if (!hookStateMap.has(element)) {
    hookStateMap.set(element, []);
  }
  currentHookStateIndex = -1;
  element.render();
  const afterRenderQueueLength = afterRenderQueue.length;
  let afterRenderQueueIndex = afterRenderQueueLength;
  while (afterRenderQueueIndex--) {
    const afterRenderQueueLocalIndex =
      afterRenderQueueLength - afterRenderQueueIndex - 1;
    afterRenderQueue[afterRenderQueueLocalIndex]();
  }
  afterRenderQueue.length = 0;
  currentHookStateIndex = undefined;
};
const unqeue = () => {
  const queue = [...renderQueue];
  renderQueue.length = 0;
  rendering = true;
  requestAnimationFrame(() => {
    queue.forEach(element => render(element));
    rendering = false;
    if (renderQueue.length > 0) unqeue();
  });
};
export const queueRender = (element, force) => {
  if (
    (renderQueue.indexOf(element) === -1 && element._isConnected === true) ||
    force
  ) {
    renderQueue.push(element);
  }
  if (!rendering) {
    unqeue();
  }
};
export const getPassableProps = id => {
  const props = passPropsMap.get(id);
  passPropsMap.delete(id);
  return props;
};
let passPropsId = 100000;
export const addPassableProps = props => {
  let id = passPropsId.toString(16);
  passPropsId++;
  if (id.length % 2) {
    id = "0" + id;
  }
  passPropsMap.set(id, props);
  return id;
};
export const prps = props => {
  let id = addPassableProps(props);
  return {
    "data-props": id
  };
};
export const nextHook = () => {
  if (currentHookStateIndex === undefined) {
    throw new Error("Using hooks outside of a component is forbidden!");
  }
  currentHookStateIndex = currentHookStateIndex + 1;
};
export const createHook = hook => (...args) => {
  nextHook();
  return hook(...args);
};
export const queueAfterRender = callback => {
  afterRenderQueue.push(callback);
};

export const getCurrentHookState = initialState => {
  const hookState = hookStateMap.get(currentElement);
  if (!hookState[currentHookStateIndex]) {
    hookState[currentHookStateIndex] = initialState;
    return initialState;
  }
  return hookState[currentHookStateIndex];
};

export const getCurrentElement = () => {
  return currentElement;
};

export const defaultRenderer = (view, shadowRoot) => {
  if (
    !(view instanceof NodeList
      ? shadowRoot.contains(view[0])
      : shadowRoot.contains(view))
  ) {
    shadowRoot.innerHTML = "";
    if (view instanceof NodeList) {
      view.forEach(node => shadowRoot.appendChild(node));
    } else {
      shadowRoot.appendChild(view);
    }
  }
};
