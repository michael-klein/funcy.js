import { useHostElement } from "./use_host_element";
import { queueRender } from "../render_qeue";
const observerMap = new (WeakMap || Map)();
export const useAttribute = (attributeName, initialValue) => {
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
