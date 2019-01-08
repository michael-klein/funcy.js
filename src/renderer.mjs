let currentElement;
let currentHookStateIndex = -1;
const hookStateMap = new Map();
export const nextHook = () => {
  currentHookStateIndex = currentHookStateIndex + 1;
};
export const queueRender = element => {
  requestAnimationFrame(() => {
    currentElement = element;
    if (!hookStateMap.has(element)) {
      hookStateMap.set(element, []);
    }
    currentHookStateIndex = 0;
    element.render();
  });
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
