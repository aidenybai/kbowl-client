import 'virtual:windi.css';
import { html, render } from 'hacky';

function App() {
  return html`<div>Hello World</div>`;
}

render(html`<${App} />`, document.body);
