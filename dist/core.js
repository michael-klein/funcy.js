const contextMap = new (WeakMap ? WeakMap : Map)();
let currentContext;

const createHookApi = (name, contextMapEntry) => {
  const hookState = contextMapEntry.hookStates[contextMapEntry.hookStateIndex];
  return {
    onCleanUp(callback) {
      hookState.cleanUp = callback;
    },

    beforeNextRun(callback) {
      hookState.beforeNextRun = callback;
    },

    afterCurrentRun(callback) {
      hookState.afterCurrentRun = callback;
    },

    getContext() {
      return currentContext;
    },

    getValue(initialValue) {
      if (hookState.value === undefined) hookState.value = initialValue;
      return hookState.value;
    },

    setValue(value, silent = false) {
      let oldValue = hookState.value;
      hookState.value = value;
      if (!silent && contextMapEntry.onValueChange) contextMapEntry.onValueChange(name, value, oldValue);
    }

  };
};

const createHook = (name, hook) => {
  return (...args) => {
    if (currentContext === undefined) throw new Error("Hook was called outside of run()!");
    const contextMapEntry = contextMap.get(currentContext);
    contextMapEntry.hookStateIndex++;

    if (contextMapEntry.hookStates[contextMapEntry.hookStateIndex] === undefined) {
      contextMapEntry.hookStates[contextMapEntry.hookStateIndex] = {
        value: undefined
      };
      contextMapEntry.hookStates[contextMapEntry.hookStateIndex].hookApi = createHookApi(name, contextMapEntry);
    }

    return hook(contextMapEntry.hookStates[contextMapEntry.hookStateIndex].hookApi, ...args);
  };
};

function runLifeCycleCallback(name, hookStates) {
  for (const hookState of hookStates) {
    if (hookState[name]) {
      hookState[name]();
      hookState[name] = undefined;
    }
  }
}

const hookus = (context, onValueChange) => {
  if (!(context instanceof Object)) throw new Error("Context must be an object!");
  contextMap.set(context, {
    hookStates: [],
    hookStateIndex: -1,
    onValueChange
  });
};
const dispose = context => {
  const contextMapEntry = contextMap.get(context);
  runLifeCycleCallback("cleanUp", contextMapEntry.hookStates);
  contextMapEntry.hookStates.length = 0;
  contextMapEntry.delete(context);
};
const pocus = (context, func, ...args) => {
  if (currentContext !== undefined) throw new Error("Tried to start a run before the end of the previous run!");
  if (!contextMap.has(context)) throw new Error("Tried to start a run without a registered context!");
  currentContext = context;
  const contextMapEntry = contextMap.get(currentContext);
  contextMapEntry.hookStateIndex = -1;
  runLifeCycleCallback("beforeNextRun", contextMapEntry.hookStates);
  const result = func(...args);

  const finish = value => {
    runLifeCycleCallback("afterCurrentRun", contextMapEntry.hookStates);
    currentContext = undefined;
    return value;
  };

  if (result instanceof Promise) {
    return result.then(finish);
  } else {
    return finish(result);
  }
};
const useReducer = createHook("useReducer", ({
  getValue,
  setValue
}, reducer, initialState) => {
  const state = getValue(initialState);
  return [state, action => {
    setValue(reducer(state, action));
  }];
});
const useState = initialState => {
  const [state, dispatch] = useReducer((_, action) => {
    return action.value;
  }, initialState);
  return [state, newState => dispatch({
    type: "set_state",
    value: newState
  })];
};
const useEffect = createHook("useEffect", ({
  getValue,
  setValue,
  onCleanUp,
  afterCurrentRun
}, effect, valuesIn) => {
  let {
    values,
    cleanUp
  } = getValue({});
  let nothingChanged = false;

  if (values !== valuesIn && values && values.length > 0) {
    nothingChanged = true;
    let index = values.length;

    while (index--) {
      if (valuesIn[index] !== values[index]) {
        nothingChanged = false;
        break;
      }
    }

    values = valuesIn;
  }

  if (!nothingChanged) {
    if (cleanUp) cleanUp();
    afterCurrentRun(() => {
      cleanUp = effect();
      setValue({
        values: valuesIn,
        cleanUp
      });

      if (cleanUp) {
        onCleanUp(() => {
          cleanUp();
        });
      } else {
        onCleanUp(undefined);
      }
    });
  }
});

const passPropsMap = new Map();
let rendering = false;
const renderQueue = [];
const render = element => {
  return pocus(element, element.render);
};
const unqeue = async () => {
  const length = renderQueue.length;
  rendering = true;
  Promise.resolve().then(async () => {
    let index = length;
    while (index--) {
      await render(renderQueue[length - index - 1]);
    }
    renderQueue.splice(0, length);
    rendering = false;
    if (renderQueue.length > 0) unqeue();
  });
};
const queueRender = (element, force) => {
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
const getPassableProps = id => {
  const props = passPropsMap.get(id);
  passPropsMap.delete(id);
  return props;
};
let passPropsId = 100000;
const addPassableProps = props => {
  let id = passPropsId.toString(16);
  passPropsId++;
  if (id.length % 2) {
    id = "0" + id;
  }
  passPropsMap.set(id, props);
  return id;
};
const prps = props => {
  let id = addPassableProps(props);
  return {
    "data-props": id
  };
};
const defaultRenderer = (view, shadowRoot) => {
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

const componentMap = new Map();
function addComponent(name, options = {}) {
  class Component extends HTMLElement {
    constructor() {
      super();
      this._props = {};
      this._renderer = defaultRenderer;
      this._isConnected = false;
      hookus(this, (name, value, oldValue) => {
        if (name === "useReducer" && value !== oldValue) {
          queueRender(element);
        }
      });
    }
    connectedCallback() {
      if (!this._shadowRoot) {
        this._shadowRoot = this.attachShadow({
          mode: "open",
          ...(options.shadowOptions ? options.shadowOptions : {})
        });
      }
      if (!this._isConnected) {
        this._isConnected = true;
        queueRender(this);
      }
    }
    disconnectedCallback() {
      if (this._isConnected) {
        this._isConnected = false;
        queueRender(this);
      }
    }
    destroy() {
      this.parentElement.removeChild(this);
      dispose(this);
    }
    async render() {
      const propsId = this.getAttribute("data-props");
      if (propsId) {
        this._props = getPassableProps(propsId);
        this.skipQueue = true;
        this.removeAttribute("data-props");
      }
      const view = await Promise.resolve().then(() =>
        componentMap.get(name)(this._props)
      );
      await this._renderer(view, this._shadowRoot);
      this.init = false;
    }
    attributeChangedCallback(attrName, oldVal, newVal) {
      if (this.init) {
        return;
      }
      if (!this.skipQueue && oldVal !== newVal) {
        queueRender(this);
      }
      this.skipQueue = false;
    }
    static get observedAttributes() {
      let observedAttributes = ["data-props"];
      if (options.observedAttributes) {
        observedAttributes = observedAttributes.concat(
          options.observedAttributes
        );
      }
      return observedAttributes;
    }
  }
  customElements.define(name, Component);
}
const defineComponent = (name, component, options = {}) => {
  if (!componentMap.has(name)) {
    componentMap.set(name, component);
    addComponent(name, options);
  } else {
    console.warn(`Component ${name} was already defined.`);
  }
};

const useAttribute = createHook(
  "useAttribute",
  (attributeName, { getContext }) => {
    const element = getContext();
    const attributeValue = element.getAttribute(attributeName);
    return [
      attributeValue,
      value => {
        element.skipQueue = true;
        element.setAttribute(attributeName, value);
      }
    ];
  }
);

const useCSS = createHook("useCSS", (parts, ...slots) => {
  const { getContext } = slots.pop();
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
  const shadowRoot = getContext()._shadowRoot;
  const style = document.createElement("style");
  style.innerHTML = styles;
  useEffect(() => {
    shadowRoot.appendChild(style);
    return () => {
      shadowRoot.removeChild(style);
    };
  });
});

const useExposeMethod = createHook(
  "useExposeMethod",
  (name, method, { getContext }) => {
    const element = getContext();
    element[name] = (...args) => method(...args);
  }
);

const useRenderer = createHook(
  "useRenderer",
  (rendererIn, { getContext, getState }) => {
    const renderer = getState(rendererIn);
    getContext()._renderer = renderer;
  }
);

const useHostElement = createHook("useHostElement", ({ getContext }) => {
  return getContext();
});

const useShadowRoot = createHook("useShadowRoot", ({ getContext }) => {
  return getContext()._shadowRoot;
});

const useConnectedState = createHook(
  "useConnectedState",
  ({ getContext }) => {
    const element = getContext();
    return element._isConnected;
  }
);

export { defineComponent, prps, createHook, useReducer, useState, useEffect, useAttribute, useCSS, useExposeMethod, useRenderer, useHostElement, useShadowRoot, useConnectedState };
//# sourceMappingURL=core.js.map

    "useExposeMethod",
    (name, method, { getContext }) => {
      const element = getContext();
      element[name] = (...args) => method(...args);
    }
  );

  const useRenderer = createHook(
    "useRenderer",
    (rendererIn, { getContext, getState }) => {
      const renderer = getState(rendererIn);
      getContext()._renderer = renderer;
    }
  );

  const useHostElement = createHook("useHostElement", ({ getContext }) => {
    return getContext();
  });

  const useShadowRoot = createHook("useShadowRoot", ({ getContext }) => {
    return getContext()._shadowRoot;
  });

  const useConnectedState = createHook(
    "useConnectedState",
    ({ getContext }) => {
      const element = getContext();
      return element._isConnected;
    }
  );

  exports.defineComponent = defineComponent;
  exports.prps = prps;
  exports.createHook = createHook;
  exports.useReducer = useReducer;
  exports.useState = useState;
  exports.useEffect = useEffect;
  exports.useAttribute = useAttribute;
  exports.useCSS = useCSS;
  exports.useExposeMethod = useExposeMethod;
  exports.useRenderer = useRenderer;
  exports.useHostElement = useHostElement;
  exports.useShadowRoot = useShadowRoot;
  exports.useConnectedState = useConnectedState;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=core.js.map
