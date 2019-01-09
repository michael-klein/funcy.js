let currentElement;
let currentHookStateIndex = -1;
const hookStateMap = new Map();
const passPropsMap = new Map();
let rendering = false;
const renderQueue = [];
const afterRenderQueue = [];
const render = () => {
  const start = Date.now();
  const element = renderQueue.shift();
  currentElement = element;
  if (!hookStateMap.has(element)) {
    hookStateMap.set(element, []);
  }
  currentHookStateIndex = 0;
  element.render();
  const afterRenderQueueLength = afterRenderQueue.length;
  let afterRenderQueueIndex = afterRenderQueueLength;
  while (afterRenderQueueIndex--) {
    const afterRenderQueueLocalIndex =
      afterRenderQueueLength - afterRenderQueueIndex - 1;
    afterRenderQueue[afterRenderQueueLocalIndex]();
  }
  afterRenderQueue.length = 0;
  rendering = false;
  if (renderQueue.length > 0) {
    if (Date.now() - start > 1000 / 60) {
      requestAnimationFrame(unqeue);
    } else {
      unqeue();
    }
  }
};
const unqeue = () => {
  rendering = true;
  render();
};

export const queueRender = element => {
  if (renderQueue.indexOf(element) === -1) {
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
export const addPassableProps = props => {
  let id = Date.now().toString(16);
  if (id.length % 2) {
    id = "0" + id;
  }
  passPropsMap.set(id, props);
  return id;
};

export const nextHook = () => {
  currentHookStateIndex = currentHookStateIndex + 1;
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
