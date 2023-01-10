import { makeid } from './shared';
import { html, render } from 'hacky';

function App() {
  return html`<div class="container-fluid constrain">
    <div style=${{ paddingTop: '4rem' }} className="headings text-center">
      <h1><img width="200" src="/logo.png" /></h1>
      <h2 style=${{ paddingTop: '1rem' }}>Let's play Knowledge Bowl!</h2>
    </div>
    <article>
      <div className="text-center">
        <input
          id="code"
          className="text-center"
          maxlength="5"
          minlength="5"
          placeholder="Enter room code"
        />
        <button
          onClick=${(event: Event) => {
            event.preventDefault();
            const room = (<HTMLInputElement>document.getElementById('code')).value.toUpperCase();
            if (!room || room.length !== 5) return alert('Invalid room code');
            window.location.href = `/buzzer.html?room=${room}`;
          }}
          className="contrast"
        >
          Enter
        </button>

        <small>
          Are you a teacher?${' '}
          <a
            onClick=${(event: Event) => {
              event.preventDefault();
              window.location.href = `/host.html?room=${makeid(5)}`;
            }}
          >
            Create a room.
          </a>
        </small>
      </div>
    </article>
  </div>`;
}

render(html`<${App} />`, document.body);

const input = document.getElementById('code')!;
const regex = new RegExp('^[a-zA-Z]*$');

input.addEventListener('beforeinput', (event) => {
  if (event.data != null && !regex.test(event.data)) event.preventDefault();
});
