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

  function e(){}var t={},n=[],o=[];function r(t,r){var i,l,a,s,c=arguments,p=o;for(s=arguments.length;s-- >2;)n.push(c[s]);for(r&&null!=r.children&&(n.length||n.push(r.children),delete r.children);n.length;)if((l=n.pop())&&void 0!==l.pop)for(s=l.length;s--;)n.push(l[s]);else"boolean"==typeof l&&(l=null),(a="function"!=typeof t)&&(null==l?l="":"number"==typeof l?l=String(l):"string"!=typeof l&&(a=!1)),a&&i?p[p.length-1]+=l:p===o?p=[l]:p.push(l),i=a;var u=new e;return u.nodeName=t,u.children=p,u.attributes=null==r?void 0:r,u.key=null==r?void 0:r.key,u}function i(e,t){for(var n in t)e[n]=t[n];return e}var l="function"==typeof Promise?Promise.resolve().then.bind(Promise.resolve()):setTimeout,a=/acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i,s=[];function c(e){!e._dirty&&(e._dirty=!0)&&1==s.push(e)&&l(p);}function p(){var e,t=s;for(s=[];e=t.pop();)e._dirty&&B(e);}function u(e,t){return e.normalizedNodeName===t||e.nodeName.toLowerCase()===t.toLowerCase()}function f(e){var t=i({},e.attributes);t.children=e.children;var n=e.nodeName.defaultProps;if(void 0!==n)for(var o in n)void 0===t[o]&&(t[o]=n[o]);return t}function d(e){var t=e.parentNode;t&&t.removeChild(e);}function v(e,t,n,o,r){if("className"===t&&(t="class"),"key"===t);else if("ref"===t)n&&n(null),o&&o(e);else if("class"!==t||r)if("style"===t){if(o&&"string"!=typeof o&&"string"!=typeof n||(e.style.cssText=o||""),o&&"object"==typeof o){if("string"!=typeof n)for(var i in n)i in o||(e.style[i]="");for(var i in o)e.style[i]="number"==typeof o[i]&&!1===a.test(i)?o[i]+"px":o[i];}}else if("dangerouslySetInnerHTML"===t)o&&(e.innerHTML=o.__html||"");else if("o"==t[0]&&"n"==t[1]){var l=t!==(t=t.replace(/Capture$/,""));t=t.toLowerCase().substring(2),o?n||e.addEventListener(t,_,l):e.removeEventListener(t,_,l),(e._listeners||(e._listeners={}))[t]=o;}else if("list"!==t&&"type"!==t&&!r&&t in e)!function(e,t,n){try{e[t]=n;}catch(e){}}(e,t,null==o?"":o),null!=o&&!1!==o||e.removeAttribute(t);else{var s=r&&t!==(t=t.replace(/^xlink:?/,""));null==o||!1===o?s?e.removeAttributeNS("http://www.w3.org/1999/xlink",t.toLowerCase()):e.removeAttribute(t):"function"!=typeof o&&(s?e.setAttributeNS("http://www.w3.org/1999/xlink",t.toLowerCase(),o):e.setAttribute(t,o));}else e.className=o||"";}function _(e){return this._listeners[e.type](e)}var h=[],m=0,y=!1,b=!1;function g(){for(var e;e=h.pop();)e.componentDidMount&&e.componentDidMount();}function C(e,t,n,o,r,i){m++||(y=null!=r&&void 0!==r.ownerSVGElement,b=null!=e&&!("__preactattr_"in e));var l=x(e,t,n,o,i);return r&&l.parentNode!==r&&r.appendChild(l),--m||(b=!1,i||g()),l}function x(e,t,n,o,r){var i=e,l=y;if(null!=t&&"boolean"!=typeof t||(t=""),"string"==typeof t||"number"==typeof t)return e&&void 0!==e.splitText&&e.parentNode&&(!e._component||r)?e.nodeValue!=t&&(e.nodeValue=t):(i=document.createTextNode(t),e&&(e.parentNode&&e.parentNode.replaceChild(i,e),N(e,!0))),i.__preactattr_=!0,i;var a,s,c=t.nodeName;if("function"==typeof c)return function(e,t,n,o){var r=e&&e._component,i=r,l=e,a=r&&e._componentConstructor===t.nodeName,s=a,c=f(t);for(;r&&!s&&(r=r._parentComponent);)s=r.constructor===t.nodeName;r&&s&&(!o||r._component)?(T(r,c,3,n,o),e=r.base):(i&&!a&&(P(i),e=l=null),r=S(t.nodeName,c,n),e&&!r.nextBase&&(r.nextBase=e,l=null),T(r,c,1,n,o),e=r.base,l&&e!==l&&(l._component=null,N(l,!1)));return e}(e,t,n,o);if(y="svg"===c||"foreignObject"!==c&&y,c=String(c),(!e||!u(e,c))&&(a=c,(s=y?document.createElementNS("http://www.w3.org/2000/svg",a):document.createElement(a)).normalizedNodeName=a,i=s,e)){for(;e.firstChild;)i.appendChild(e.firstChild);e.parentNode&&e.parentNode.replaceChild(i,e),N(e,!0);}var p=i.firstChild,_=i.__preactattr_,h=t.children;if(null==_){_=i.__preactattr_={};for(var m=i.attributes,g=m.length;g--;)_[m[g].name]=m[g].value;}return !b&&h&&1===h.length&&"string"==typeof h[0]&&null!=p&&void 0!==p.splitText&&null==p.nextSibling?p.nodeValue!=h[0]&&(p.nodeValue=h[0]):(h&&h.length||null!=p)&&function(e,t,n,o,r){var i,l,a,s,c,p=e.childNodes,f=[],v={},_=0,h=0,m=p.length,y=0,b=t?t.length:0;if(0!==m)for(var g=0;g<m;g++){var C=p[g],k=C.__preactattr_,w=b&&k?C._component?C._component.__key:k.key:null;null!=w?(_++,v[w]=C):(k||(void 0!==C.splitText?!r||C.nodeValue.trim():r))&&(f[y++]=C);}if(0!==b)for(var g=0;g<b;g++){c=null;var w=(s=t[g]).key;if(null!=w)_&&void 0!==v[w]&&(c=v[w],v[w]=void 0,_--);else if(!c&&h<y)for(i=h;i<y;i++)if(void 0!==f[i]&&(S=l=f[i],T=r,"string"==typeof(L=s)||"number"==typeof L?void 0!==S.splitText:"string"==typeof L.nodeName?!S._componentConstructor&&u(S,L.nodeName):T||S._componentConstructor===L.nodeName)){c=l,f[i]=void 0,i===y-1&&y--,i===h&&h++;break}c=x(c,s,n,o),a=p[g],c&&c!==e&&c!==a&&(null==a?e.appendChild(c):c===a.nextSibling?d(a):e.insertBefore(c,a));}var S,L,T;if(_)for(var g in v)void 0!==v[g]&&N(v[g],!1);for(;h<=y;)void 0!==(c=f[y--])&&N(c,!1);}(i,h,n,o,b||null!=_.dangerouslySetInnerHTML),function(e,t,n){var o;for(o in n)t&&null!=t[o]||null==n[o]||v(e,o,n[o],n[o]=void 0,y);for(o in t)"children"===o||"innerHTML"===o||o in n&&t[o]===("value"===o||"checked"===o?e[o]:n[o])||v(e,o,n[o],n[o]=t[o],y);}(i,t.attributes,_),y=l,i}function N(e,t){var n=e._component;n?P(n):(null!=e.__preactattr_&&e.__preactattr_.ref&&e.__preactattr_.ref(null),!1!==t&&null!=e.__preactattr_||d(e),k(e));}function k(e){for(e=e.lastChild;e;){var t=e.previousSibling;N(e,!0),e=t;}}var w={};function S(e,t,n){var o,r=w[e.name];if(e.prototype&&e.prototype.render?(o=new e(t,n),U.call(o,t,n)):((o=new U(t,n)).constructor=e,o.render=L),r)for(var i=r.length;i--;)if(r[i].constructor===e){o.nextBase=r[i].nextBase,r.splice(i,1);break}return o}function L(e,t,n){return this.constructor(e,n)}function T(e,n,o,r,i){e._disable||(e._disable=!0,(e.__ref=n.ref)&&delete n.ref,(e.__key=n.key)&&delete n.key,!e.base||i?e.componentWillMount&&e.componentWillMount():e.componentWillReceiveProps&&e.componentWillReceiveProps(n,r),r&&r!==e.context&&(e.prevContext||(e.prevContext=e.context),e.context=r),e.prevProps||(e.prevProps=e.props),e.props=n,e._disable=!1,0!==o&&(1!==o&&!1===t.syncComponentUpdates&&e.base?c(e):B(e,1,i)),e.__ref&&e.__ref(e));}function B(e,t,n,o){if(!e._disable){var r,l,a,s=e.props,c=e.state,p=e.context,u=e.prevProps||s,d=e.prevState||c,v=e.prevContext||p,_=e.base,y=e.nextBase,b=_||y,x=e._component,k=!1;if(_&&(e.props=u,e.state=d,e.context=v,2!==t&&e.shouldComponentUpdate&&!1===e.shouldComponentUpdate(s,c,p)?k=!0:e.componentWillUpdate&&e.componentWillUpdate(s,c,p),e.props=s,e.state=c,e.context=p),e.prevProps=e.prevState=e.prevContext=e.nextBase=null,e._dirty=!1,!k){r=e.render(s,c,p),e.getChildContext&&(p=i(i({},p),e.getChildContext()));var w,L,U=r&&r.nodeName;if("function"==typeof U){var M=f(r);(l=x)&&l.constructor===U&&M.key==l.__key?T(l,M,1,p,!1):(w=l,e._component=l=S(U,M,p),l.nextBase=l.nextBase||y,l._parentComponent=e,T(l,M,0,p,!1),B(l,1,n,!0)),L=l.base;}else a=b,(w=x)&&(a=e._component=null),(b||1===t)&&(a&&(a._component=null),L=C(a,r,p,n||!_,b&&b.parentNode,!0));if(b&&L!==b&&l!==x){var W=b.parentNode;W&&L!==W&&(W.replaceChild(L,b),w||(b._component=null,N(b,!1)));}if(w&&P(w),e.base=L,L&&!o){for(var A=e,E=e;E=E._parentComponent;)(A=E).base=L;L._component=A,L._componentConstructor=A.constructor;}}if(!_||n?h.unshift(e):k||e.componentDidUpdate&&e.componentDidUpdate(u,d,v),null!=e._renderCallbacks)for(;e._renderCallbacks.length;)e._renderCallbacks.pop().call(e);m||o||g();}}function P(e){var t=e.base;e._disable=!0,e.componentWillUnmount&&e.componentWillUnmount(),e.base=null;var n=e._component;n?P(n):t&&(t.__preactattr_&&t.__preactattr_.ref&&t.__preactattr_.ref(null),e.nextBase=t,d(t),function(e){var t=e.constructor.name;(w[t]||(w[t]=[])).push(e);}(e),k(t)),e.__ref&&e.__ref(null);}function U(e,t){this._dirty=!0,this.context=t,this.props=e,this.state=this.state||{};}i(U.prototype,{setState:function(e,t){var n=this.state;this.prevState||(this.prevState=i({},n)),i(n,"function"==typeof e?e(n,this.props):e),t&&(this._renderCallbacks=this._renderCallbacks||[]).push(t),c(this);},forceUpdate:function(e){e&&(this._renderCallbacks=this._renderCallbacks||[]).push(e),B(this,2);},render:function(){}});var M={},W=JSON.stringify;var A=function(e){for(var t,n,o,r,i,l=0,a="return ",s="",c="",p=0,u="",f="",d="",v=0,_=function(){o?9===l?(p++&&(a+=","),a+="h("+(c||W(s)),l=0):13===l||0===l&&"..."===s?(0===l?(d||(d=")",u=u?"Object.assign("+u:"Object.assign({}"),u+=f+","+c,f=""):r&&(u+=u?","+(f?"":"{"):"{",f="}",u+=W(r)+":",u+=c||(i||s)&&W(s)||"true",r=""),i=!1):0===l&&(l=13,r=s,s=c="",_(),l=0):(c||(s=s.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))&&(p++&&(a+=","),a+=c||W(s)),s=c="";},h=0;h<e.length;h++){h>0&&(o||_(),c="$["+h+"]",_());for(var m=0;m<e[h].length;m++){if(n=e[h].charCodeAt(m),o){if(39===n||34===n){if(v===n){v=0;continue}if(0===v){v=n;continue}}if(0===v)switch(n){case 62:_(),47!==l&&(a+=u?","+u+f+d:",null"),t&&(a+=")"),o=0,u="",l=1;continue;case 61:l=13,i=!0,r=s,s="";continue;case 47:t||(t=!0,9!==l||s.trim()||(s=c="",l=47));continue;case 9:case 10:case 13:case 32:_(),l=0;continue}}else if(60===n){_(),o=1,d=f=u="",t=i=!1,l=9;continue}s+=e[h].charAt(m);}}return _(),Function("h","$",a)};function E(e,t){!function(e,t,n){C(n,e,{},!1,t,!1);}(e,t,t.firstElementChild);}var V=function(e){for(var t=".",n=0;n<e.length;n++)t+=e[n].length+","+e[n];return (M[t]||(M[t]=A(e)))(this,arguments)}.bind(r);

  const usePreactHtm = createHook(() => {
    useRenderer((view, shadowRoot) => {
      E(view, shadowRoot);
    });
    return V;
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
  exports.usePreactHtm = usePreactHtm;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=full.js.map
