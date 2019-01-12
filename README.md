
<p align="center">
  <img src="https://i.imgur.com/HlOLFhy.png" width="300" alt="funcyjs logo">
</p>
<h1 align="center">
  A functional web-components wrapper
</h1>
<p align="center">
  <img src="https://i.imgur.com/1nJ9kJd.png" width="572" alt="example of code">
</p>

### Why 'funcy.js'?

Naming things is hard and 'funcyjs' (pronounced like funky) seemed like a [fun](http://www.badum-tish.com/), recognizable name.

### What is it?

funcy.js seeks to provide a functional way of defining web components, very much akin to [react](https://reactjs.org/)  [functional components](https://reactjs.org/docs/components-and-props.html#function-and-class-components) with [hooks](https://reactjs.org/docs/hooks-intro.html). This is as of right now *purely experimental*.

https://codepen.io/michael-klein/pen/xmQZBx

### Browser Compatibility

The library is published is not transpiled for browser compatibility and does not contain any polyfills. As such you can use it as an es6 module in the latest version of chrome and other browsers that implement the latest JavaScript features including web components v1, but it will fail horribly anywhere else, so you will have to provide polyfills/transpilation if you want to use this in more browsers.

### Installation

Using npm:

```js
npm install funcy-components
```

```js
import {defineComponent} from "funcy-components"
```

As ES6 module via hotlinking from unpkg:

```js
import {defineComponent} from "https://unpkg.com/funcy-components/dist/core.min.mjs"
```

or the full version with all hooks:

```js
import {defineComponent} from "https://unpkg.com/funcy-components/dist/full.min.mjs"
```

### Usage

#### The bare minimum:

```js
import {defineComponent} from "https://unpkg.com/funcy-components/dist/full.min.mjs";

defineComponent("a-component", () => {
 const div = document.createElement("div");
 div.innerHTML = "Hello World!";
 return div;
});
```
:pencil2:[pen](https://codepen.io/michael-klein/pen/roQvjr)

What's happening here?
defineComponent is a method with the signature:
```ts
function defineComponent(name:string, component:(props:any) => View, options:DefineComponentOptions = {}):void;
```
It will define a web component via _customElements.define_ by internally creating a class that extends HTMLElement using the supplied name. 

component is a function that accepts props and returns a View (just like functional components in react). It will be called whenever the component needs to (re-)render. A View is anything that can be consumed by a renderer (more on that in a bit). In the above example, the View is simply a div element. The default renderer will simply replace the current content of the shadowRoot with the view (unless you return the same nodes).

defineComponent also accepts an options object, that allows you to define observed attributes and pass options to [attachShadow](developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow)
```ts
interface DefineComponentOptions {
  observedAttributes:string[],
  shadowOptions:ShadowRootInit
}
```

#### Props

Normally, you can only pass data to custom elements via attributes, which only support string values.

#### Hooks: The basics

Hooks are a way to use state or other internal features in your functional components. They were first popularized by react. Read more about the motivation and use of the basic hooks (useReducer, useState, useEffect) in the react docs: https://reactjs.org/docs/hooks-intro.html. The basic hooks that funcyjs has in common with react should work exactly the same. If they don't, pease submit an issue :)

In the following I will explain how to use some of the hooks which are specific to funcyjs.

#### Custom renderers

A custom renderer is a function that takes a View and a shadowRoot and knows how to render the View to the shadowRoot. It is called after a component renders with the generated View and the shadowRoot of the elment. For example, this is the default renderer:
```js
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
```

You can define your own custom renderer with the useRenderer hook. funcyjs exports a custom usePreactHtm hook that uses [htm](https://github.com/developit/htm) and [preact](https://preactjs.com) in the full bundle:
```js
import { createHook, useRenderer } from "../export_core.mjs";
import { html, render } from "../../node_modules/htm/preact/standalone.mjs";
export const usePreactHtm = createHook(() => {
  useRenderer((view, shadowRoot) => {
    render(view, shadowRoot);
  });
  return html;
});
```
It also returns a html template tag that can be used to construct the view which is consumed with the render call.

#### Attributes

CustomElements can have attributes, just like any other element. The useAttribute hook will enable you to access and modify these:
```js
defineComponent(
  "attribute-example",
  () => {
    const html = usePreactHtm();
    const [name, setName] = useAttribute("name");
    return html`
        <input type="text" onInput=${e => setName(e.target.value)} value=${name}></input>
    `;
  },
  {
    observedAttributes: ["name"]
  }
);
```
:pencil2:[pen](https://codepen.io/michael-klein/pen/NeEMZy)

The above example will reflect changes you make to the input back to the attribute on the component in the DOM. Note that we also supplied "name" as an observedAttribute, so that when an outside source changes the attribute, the component will re-render (the setter from useAttribute won't trigger a re-render).

#### CSS

You can render CSS directly to the view, if you which. You can also use the useCSS hook for that purpose. The hook can act as a normal function or a template tag and will render the CSS you pass it to the shadowRoot:
```js
defineComponent(
  "css-example",
  () => {
    const html = usePreactHtm();
    useCSS('h1 {color:green;}');
    const css = useCSS;
    css`
      h2 {
        color:red;
      }
      `
    return html`
      <div>
        <h1>green</h1>
        <h2>red</h2>
      </div>
    `;
  }
);
```
:pencil2:[pen](https://codepen.io/michael-klein/pen/wRQXMm)

#### Exposing an API

CustomElements can expose API methods for others to consume. In funcyjs, this is done through the useExposeMethod hook:
```js
defineComponent(
  "expose-method",
  () => {
    const html = usePreactHtm();
    useExposeMethod("methodName", () => alert("you used this method!"));
    return html`<div>something</div>`;
  }
);
```

Note that wether you use an arrow function or a normal function, this will never be bound to the CustomElement instance.

#### others:

You can access the host element, the shadow root or get information on the connected state of the component with the useHostElement, useShadowRoot useConnectedState hooks. Use them sparingly if at all.

#### currently implemented hooks:

core hooks:
* __useReducer__
* __useState__
* __useEffect__
* useRenderer 
* useAttribute
* useCSS
* useExposeMethod
* useConnectedState
* useHostElement
* useShadowRoot

other (only present in full bundles):
* usePreactHtm
