(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.funcyjs = {}));
}(this, function (exports) { 'use strict';

  const runMap = window.___hookusPocusRunMap || new (WeakMap || Map)();
  window.___hookusPocusRunMap = runMap;

  const hookDataStack = runMap.h || [];
  runMap.h = hookDataStack;

  const dataMap = runMap.d || new (WeakMap || Map)();
  runMap.d = dataMap;
  const hookus = hookFunction => {
    return function hook() {
      const context = hookDataStack[runMap.stackIndex][0];
      runMap.hookIndex++;
      const data =
        hookDataStack[runMap.stackIndex][runMap.hookIndex] ||
        (hookDataStack[runMap.stackIndex][runMap.hookIndex] = [
          { context, hook: hookFunction }
        ]);
      return (dataMap.get(hook) || hookFunction).apply(
        {},
        data.concat(Array.from(arguments))
      );
    };
  };
  const runLifeCycles = (context, name) => {
    const promises = hookDataStack[runMap.stackIndex]
      .map(data => {
        if (data[0] && data[0][name]) {
          const result = data[0][name]();
          data[0][name] = 0;
          return result;
        }
      })
      .filter(result => result instanceof Promise);
    if (promises.length > 0) {
      const promiseAll = Promise.all(promises);
      runMap.set(
        context,
        runMap.has(context) ? runMap.get(context).then(promiseAll) : promiseAll
      );
    }
  };
  const waitForContext = (context, cb) => {
    if (runMap.has(context)) {
      const promise = runMap.get(context).then(cb);
      runMap.set(context, promise);
      return promise;
    } else {
      return cb();
    }
  };
  const run = (context, cleanUp, func, args) => {
    if (cleanUp === true) {
      runMap.set(context, runLifeCycles(context, "cleanUp"));
      dataMap.delete(context);
    } else {
      return waitForContext(context, () => {
        runMap.hookIndex = 0;
        runMap.stackIndex =
          hookDataStack.push(dataMap.get(context) || [context]) - 1;
        dataMap.set(context, hookDataStack[runMap.stackIndex]);
        runLifeCycles(context, "before");
        return waitForContext(context, () => {
          let result = func.apply(func, args);
          runLifeCycles(context, "after");
          return waitForContext(context, () => {
            hookDataStack.pop();
            runMap.delete(context);
            return result;
          });
        });
      });
    }
  };
  const pocus = function() {
    const args = Array.from(arguments);
    let funcArgs;
    if (args[0]["pop"]) {
      funcArgs = args.shift();
    }
    const context = typeof args[1] === "boolean" ? args[0] : args[1] || args[0];
    const cleanUp = args[1] === true || args[2];
    return run(context, cleanUp, args[0], funcArgs);
  };

  const useReducer = hookus((data, reducer, initialArg, init) => {
    data.s = data.s !== undefined ? data.s : init ? init(initialArg) : initialArg;
    return [
      data.s,
      action => {
        data.s = reducer(data.s, action);
        return data.s;
      }
    ];
  });

  const on = (hook, cb) => {
    dataMap.set(hook, cb);
  };

  const useLayoutEffect = hookus((data, effect, values) => {
    if (
      !data.v ||
      (values &&
        !(
          values.length === data.v.length &&
          values.every(value => ~data.v.indexOf(value))
        ))
    ) {
      data.v = values;
      if (data.cleanUp) {
        data.cleanUp();
      }
      data.after = () => {
        let result = effect();
        if (result instanceof Promise) {
          result = result.then(cleanUp => (data.cleanUp = cleanUp));
        } else {
          data.cleanUp = result;
        }
        return result;
      };
    }
  });

  const useEffect = (effect, values) => {
    useLayoutEffect(
      () => new Promise(resolve => requestAnimationFrame(_ => resolve(effect()))),
      values
    );
  };

  const useState = initialState => {
    const [state, dispatch] = useReducer(
      (_, action) => action.value,
      initialState
    );
    return [
      state,
      newState =>
        dispatch({
          value: newState
        })
    ];
  };

  const useHostElement = hookus(data => {
    return data.context;
  });

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
  const queueRender = component => {
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

  const observerMap = new (WeakMap || Map)();
  const useAttribute = (attributeName, initialValue) => {
    const element = useHostElement();
    if (!element.hasAttribute(attributeName) && initialValue !== undefined) {
      element.setAttribute(attributeName, initialValue);
    }
    const attributeValue = element.getAttribute(attributeName);
    let observer;
    if (!observerMap.has(element)) {
      observer = new MutationObserver(_ => {
        queueRender(element);
      });
      observerMap.set(element, observer);
      observer.observe(element, { attributes: true });
    } else {
      observer = observerMap.get(element);
    }
    return [
      attributeValue,
      value => {
        observer.disconnect();
        element.setAttribute(attributeName, value);
        observer.observe(element, { attributes: true });
      }
    ];
  };

  const useProp = hookus((data, name, initialValue) => {
    const element = data.context;
    let setProp = data.v;
    if (!setProp) {
      let paused = false;
      if (element[name] === undefined || element.hasOwnProperty(name)) {
        let val = element[name] || initialValue;
        Object.defineProperty(element, name, {
          set: value => {
            if (val !== value) {
              val = value;
              if (!paused) {
                queueRender(element);
              }
            }
          },
          get: () => val
        });
      }
      setProp = value => {
        paused = true;
        element[name] = value;
        paused = false;
      };
      if (element[name] === undefined) {
        setProp(initialValue);
      }
      data.v = setProp;
    }
    return [element[name], setProp];
  });

  const useRenderer = hookus((data, rendererIn) => {
    data.context.renderer = rendererIn;
  });

  function component(name, comp, options) {
    class Component extends HTMLElement {
      constructor() {
        super();
        if (!this.shadowRoot) {
          this.attachShadow(
            Object.assign(
              {
                mode: "open"
              },
              options
            )
          );
        }
        queueRender(this);
      }
      renderer(view, shadowRoot) {
        if (
          view &&
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
      }
      render() {
        const view = pocus(comp, this);
        return this.renderer(view, this.shadowRoot);
      }
    }
    customElements.define(name, Component);
  }

  exports.useHostElement = useHostElement;
  exports.useAttribute = useAttribute;
  exports.useProp = useProp;
  exports.useRenderer = useRenderer;
  exports.component = component;
  exports.useReducer = useReducer;
  exports.useState = useState;
  exports.useEffect = useEffect;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.js.map
