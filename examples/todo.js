import {
  defineComponent,
  useReducer,
  useState,
  usePreactHtm,
  useEffect,
  prps,
  useAttribute
} from "../src/index.mjs";

defineComponent("todo-list", () => {
  const [currentItemId, setCurrentItemId] = useState(0);
  const [items, setItems] = useState([
    {
      done: false,
      text: "",
      id: currentItemId
    }
  ]);
  const [html] = usePreactHtm();
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
  return html`
    <div>
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
  const [html] = usePreactHtm();
  const checkBoxclicked = e => {
    toggle();
  };
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
    const [html] = usePreactHtm();
    const [total] = useAttribute("total");
    const [done] = useAttribute("done");
    return html`
      <header>${done}/${total} todos finished</header>
    `;
  },
  {
    observedAttributes: ["total", "done"]
  }
);
