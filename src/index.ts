import { makeid } from './shared';
import { html, render } from 'hacky';

function App() {
  return html`<main class="container">
    <div className="headings text-center">
      <h1>KBowl</h1>
      <h2>Conduct oral knowledge bowl online!</h2>
    </div>
    <div>
      <button
        onClick=${(event: Event) => {
          event.preventDefault();
          window.location.href = `/host.html?room=${makeid(5)}`;
        }}
        className="secondary"
      >
        Create room
      </button>

      <button
        onClick=${(event: Event) => {
          event.preventDefault();
          const room = prompt('Enter room code');
          window.location.href = `/buzzer.html?room=${room}`;
        }}
        className="contrast"
      >
        Join room
      </button>
    </div>
  </main>`;
}

render(html`<${App} />`, document.body);
