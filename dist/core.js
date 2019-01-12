(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.funcyjs = {}));
}(this, function (exports) { 'use strict';

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
  const nextHook = () => {
    if (currentHookStateIndex === undefined) {
      throw new Error("Using hooks outside of a component is forbidden!");
    }
    currentHookStateIndex = currentHookStateIndex + 1;
  };
  const createHook = hook => (...args) => {
    nextHook();
    return hook(...args);
  };
  const queueAfterRender = callback => {
    afterRenderQueue.push(callback);
  };

  const getCurrentHookState = initialState => {
    const hookState = hookStateMap.get(currentElement);
    if (!hookState[currentHookStateIndex]) {
      hookState[currentHookStateIndex] = initialState;
      return initialState;
    }
    return hookState[currentHookStateIndex];
  };

  const getCurrentElement = () => {
    return currentElement;
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
          queueRender(this, true);
        }
      }
      render() {
        const propsId = this.getAttribute("data-props");
        if (propsId) {
          this._props = getPassableProps(propsId);
          this.skipQueue = true;
          this.removeAttribute("data-props");
        }
        const view = componentMap.get(name)(this._props);
        this._renderer(view, this._shadowRoot);
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

  const useHostElement = createHook(() => {
    return getCurrentElement();
  });
  const useShadowRoot = createHook(() => {
    return useHostElement()._shadowRoot;
  });
  const useReducer = createHook((reducer, initialState) => {
    const hookState = getCurrentHookState({
      reducer,
      state: initialState
    });
    const element = useHostElement();
    return [
      hookState.state,
      action => {
        hookState.state = hookState.reducer(hookState.state, action);
        queueRender(element);
      }
    ];
  });
  const useState = createHook(initialState => {
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
  const useRenderer = createHook(rendererIn => {
    const renderer = getCurrentHookState(rendererIn);
    const element = useHostElement();
    element._renderer = renderer;
  });
  const useEffect = createHook((effect, values) => {
    const state = getCurrentHookState({
      effect,
      values,
      cleanUp: () => {}
    });
    const isConnected = useConnectedState();
    if (isConnected) {
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
    } else {
      state.cleanUp();
      state.cleanUp = () => {};
    }
  });
  const useAttribute = createHook(attributeName => {
    const element = useHostElement();
    const attributeValue = element.getAttribute(attributeName);
    return [
      attributeValue,
      value => {
        element.skipQueue = true;
        element.setAttribute(attributeName, value);
      }
    ];
  });
  const useCSS = createHook((parts, ...slots) => {
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
    const shadowRoot = useShadowRoot();
    const style = document.createElement("style");
    style.innerHTML = styles;
    useEffect(() => {
      shadowRoot.appendChild(style);
      return () => {
        shadowRoot.removeChild(style);
      };
    });
  });
  const useExposeMethod = createHook((name, method) => {
    const element = useHostElement();
    element[name] = (...args) => method(...args);
  });
  const useConnectedState = createHook(() => {
    const element = useHostElement();
    return element._isConnected;
  });

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
