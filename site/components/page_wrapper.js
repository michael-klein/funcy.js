import { funcyComponent } from "./funcy_component.js";

funcyComponent("page-wrapper", function(html, css) {
  return html`
    <div
      class="${css`
        color: red;
      `}"
    >
      hello world!
    </div>
  `;
});
