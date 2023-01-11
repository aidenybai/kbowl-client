import { makeid } from './shared';
import { html, render } from 'hacky';

function* App() {
  fetch('https://socket.kbowl.party/info')
    .then((res) => res.json())
    .then((data) => {
      const el = document.getElementById('info')!;
      el.setAttribute('data-tooltip', `${data.sockets.length} users playing!`);
      el.textContent = `${data.sockets.length} 👤`;
    });
  while (true) {
    yield html`<div class="container-fluid constrain">
      <div style=${{ paddingTop: '4rem' }} className="text-center">
        <img width="300" src="/logo.png" />
      </div>
      <article>
        <div className="text-center">
          <input
            id="code"
            className="text-center"
            maxlength="5"
            minlength="5"
            placeholder="Room Code"
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
            <a
              onClick=${(event: Event) => {
                event.preventDefault();
                window.location.href = `/host.html?room=${makeid(5)}`;
              }}
            >
              <b>Create a room 🎉</b>
            </a>
            ${' '} • ${' '}<a href="https://www.loom.com/share/344a6bf529684358a4cc6b4c4fa5d9ca"
              >Video Help</a
            >${' '} • ${' '}<a href="/faq"> FAQ </a>${' '} • ${' '}
            <span id="info">👤</span>
          </small>
        </div>
      </article>
    </div>`;
  }
}

render(html`<${App} />`, document.body);

const input = document.getElementById('code')!;
const regex = new RegExp('^[a-zA-Z]*$');

input.addEventListener('beforeinput', (event) => {
  if (event.data != null && !regex.test(event.data)) event.preventDefault();
});
