import {
  defineComponent,
  useExposeMethod,
  useState,
  useCSS,
  prps,
  useAttribute,
  usePreactHtm
} from "../dist/full.mjs";

defineComponent("todo-list", () => {
  const css = useCSS;
  css`
    ul {
      list-style: none;
      padding: 0;
    }
    button {
      width: 100%;
      text-align: center;
      margin-bottom: 10px;
      align-items: center;
      color: white;
      background: #949494;
      cursor: pointer;
      font-size: 16px;
      border-radius: 4px;
      padding: 10px;
      border: 1px solid #d0d0d0;
    }
  `;
  const [currentItemId, setCurrentItemId] = useState(0);
  const [items, setItems] = useState([
    {
      done: false,
      text: "",
      id: currentItemId
    }
  ]);
  const html = usePreactHtm();
  const addItem = () => {
    const nextItemId = currentItemId + 1;
    items.push({
      done: false,
      text: "",
      id: nextItemId
    });
    setCurrentItemId(nextItemId);
    setItems(items);
  };
  const sorted = [...items];
  const total = items.length;
  const numDone = items.filter(item => item.done).length;
  sorted.sort(item => (item.done ? 1 : -1));
  useExposeMethod("logTodos", () =>
    items.forEach(({ text, done }) => {
      console.log(`item: ${text}, state: ${done}`);
    })
  );
  return html`
    <div>
      <slot name="hello"></slot>
      <todo-header total=${total} done=${numDone}></todo-header>
      <ul>
        ${
          sorted.map(item => {
            const props = {
              ...item,
              toggle: () => {
                item.done = !item.done;
                setItems(items);
              },
              setText: text => {
                item.text = text;
                setItems(items);
              },
              removeTodo: () => {
                items.splice(items.indexOf(item), 1);
                setItems(items);
              }
            };
            return html`
              <todo-item ...${prps(props)} key=${"item-" + item.id}></todo-item>
            `;
          })
        }
      </ul>
      <button onClick=${addItem}>add todo</button>
    </div>
  `;
});

defineComponent("todo-item", ({ done, text, toggle, setText, removeTodo }) => {
  const html = usePreactHtm();
  const checkBoxclicked = e => {
    toggle();
  };
  const css = useCSS;
  css`
    li {
      margin-bottom: 10px;
      align-items: center;
      display: flex;
      background: #dfdfdf;
      border-radius: 4px;
      padding: 10px;
      box-shadow: 0px 2px 32px 0px rgba(0, 0, 0, 0.18);
      border: 1px solid #d0d0d0;
    }
    input,
    button {
      margin: 0;
      border: none;
      font-size: 16px;
      display: flex;
      align-items: center;
    }
    button,
    input[type="checkbox"] {
      cursor: pointer;
    }
    input[type="text"] {
      background: none;
    }
    input[type="text"]:focus {
      outline: none;
    }
    input[type="checkbox"] {
      margin-right: 10px;
    }
  `;
  return html`
    <li>
      <input
        type="checkbox"
        checked=${done}
        key=${text + done}
        onClick=${checkBoxclicked}
      />
      <input
        placeholder="enter a todo"
        type="text"
        value="${text}"
        onInput=${e => setText(e.target.value)}
      />
      <button onClick=${removeTodo}>x</button>
    </li>
  `;
});

defineComponent(
  "todo-header",
  () => {
    const css = useCSS;
    css`
      header {
        text-align: center;
        color: gray;
      }
    `;
    const html = usePreactHtm();
    const [total] = useAttribute("total");
    const [done] = useAttribute("done");
    return html`
      <header>${done}/${total} todos finished!</header>
    `;
  },
  {
    observedAttributes: ["total", "done"]
  }
);
