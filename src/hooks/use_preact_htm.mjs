import { createHook, useRenderer } from "../export_core.mjs";
import { html, render } from "../../node_modules/htm/preact/standalone.mjs";
export const usePreactHtm = createHook(() => {
  useRenderer((view, shadowRoot) => {
    render(view, shadowRoot);
  });
  return [html];
});
