export { createHook, useReducer, useState, useEffect } from 'hookuspocus';

const OUTSIDE_RUN = Symbol("outside_run");
let currentRun = OUTSIDE_RUN;
const hookStateMap = new (WeakMap ? WeakMap : Map)();

const reset = () => {
  currentRun = OUTSIDE_RUN;
};

const createHookApi = name => {
  const hookStates = hookStateMap.get(currentRun.context);

  if (hookStates[currentRun.hookStateIndex] === undefined) {
    hookStates[currentRun.hookStateIndex] = {};
  }

  const hookState = hookStates[currentRun.hookStateIndex];
  const onStateChange = currentRun.onStateChange;
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
      return currentRun.context;
    },

    getState(initialState) {
      if (hookState.state === undefined) hookState.state = initialState;
      return hookState.state;
    },

    setState(value, silent = false) {
      let oldValue = hookState.state;
      hookState.state = value;
      if (!silent && onStateChange) onStateChange(name, oldValue, value);
    }

  };
};

const createHook = (name, hook) => {
  return (...args) => {
    if (currentRun.context === OUTSIDE_RUN) throw new Error("Hook was called outside of run()!");
    currentRun.hookStateIndex++;
    const hookApi = createHookApi(name);
    return hook(...args, hookApi);
  };
};

function runLifeCycleCallback(name, hookStates, length) {
  let index = length;

  while (index--) {
    const hookState = hookStates[length - index - 1];

    if (hookState[name]) {
      hookState[name]();
      hookState[name] = undefined;
    }
  }
}
const dispose = context => {
  const hookStates = hookStateMap.get(context);
  runLifeCycleCallback("cleanUp", hookStates, hookStates.length);
  hookStateMap.delete(context);
};
const run = (runData, ...args) => {
  if (typeof runData === "function") {
    runData = {
      context: runData,
      function: runData
    };
  }

  if (!(runData.context instanceof Object)) throw new Error("Run was called without a valid object context!");
  currentRun = runData;
  currentRun.hookStateIndex = -1;
  let init = false;

  if (!hookStateMap.has(currentRun.context)) {
    hookStateMap.set(currentRun.context, []);
    init = true;
  }

  const hookStates = hookStateMap.get(currentRun.context);
  const length = hookStates.length;
  runLifeCycleCallback("beforeNextRun", hookStates, length);
  const result = runData.function(...args);

  if (result instanceof Promise) {
    return result.then(value => {
      runLifeCycleCallback("afterCurrentRun", hookStates, init ? hookStates.length : length);
      reset();
      return value;
    });
  } else {
    runLifeCycleCallback("afterCurrentRun", hookStates, init ? hookStates.length : length);
    reset();
    return result;
  }
};
const useEffect = createHook("useEffect", (effect, ...rest) => {
  let valuesIn;

  if (rest.length > 1) {
    valuesIn = rest[0];
  }

  const {
    getState,
    setState,
    onCleanUp,
    afterCurrentRun
  } = rest[rest.length - 1];
  let {
    values,
    cleanUp
  } = getState({});
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
      setState({
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
  return run({
    context: element,
    onStateChange: (name, state, oldState) => {
      console.log(name, state, oldState);
    },
    function: () => element.render(),
    onStateChange: name => {
      if (name === "useReducer") {
        queueRender(element);
      }
    }
  });
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

export { defineComponent, prps, useAttribute, useCSS, useExposeMethod, useRenderer, useHostElement, useShadowRoot, useConnectedState };
//# sourceMappingURL=core.js.map
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

  exports.createHook = hookuspocus.createHook;
  exports.useReducer = hookuspocus.useReducer;
  exports.useState = hookuspocus.useState;
  exports.useEffect = hookuspocus.useEffect;
  exports.defineComponent = defineComponent;
  exports.prps = prps;
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
