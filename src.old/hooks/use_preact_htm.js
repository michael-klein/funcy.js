import { createHook, useRenderer } from "../export_core.js";
import { html, render } from "../../node_modules/htm/preact/standalone.mjs";
export const usePreactHtm = createHook("usePreactHtm", () => {
  useRenderer((view, shadowRoot) => {
    render(view, shadowRoot);
  });
  return html;
});
