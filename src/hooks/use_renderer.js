import { hookus } from "../../node_modules/hookuspocus/src/index";

export const useRenderer = hookus((data, rendererIn) => {
  data.context.renderer = rendererIn;
});
