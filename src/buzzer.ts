import '@picocss/pico/css/pico.classless.min.css';
import { html, render } from 'hacky';
import { io } from 'socket.io-client';
import { getRoomCode, delay } from './shared';

document.title = `Buzzer (${getRoomCode()}) - KBowl`;

const socket = io('wss://kbowl-server.aidenybai.com');

let score = 0;
let ping = 0;
let name = '';
let appContext: any = undefined;

// TODO: Add live scoreboard + buzz
// TODO: lock/unlock room
function* App() {
  // @ts-ignore
  appContext = this;
  // @ts-ignore
  const [value, setValue] = this.createState(name);
  // @ts-ignore
  const [pause, setPause] = this.createState(0);
  while (true) {
    const isInvalidName =
      !value() || value().length > 25 || /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(value());
    yield html`<main class="container">
      <div className="headings text-center">
        <h1>Score <code>${score}</code></h1>
        <h2>Connected to room <code>${getRoomCode()}</code> <code>${ping} ms</code></h2>
      </div>
      <input
        onInput=${(event: Event) => {
          const newName = (<HTMLInputElement>event.target!).value.trim();
          setValue(newName);
          name = newName;
        }}
      />
      <button
        className="btn-large"
        disabled=${isInvalidName}
        onClick=${async (event: Event) => {
          const el = <HTMLButtonElement>event.target;
          el.disabled = true;
          socket.emit('request-buzz', { team: value(), ping: Date.now() });

          setPause(3);
          for (let i = 2; i >= 0; i--) {
            await delay(1000);
            setPause(i);
          }
          el.disabled = false;
        }}
      >
        ${pause() === 0 ? 'BUZZ' : pause()}
      </button>
      ${isInvalidName
        ? html`<p className="text-center red">
            Invalid Name (Max length 25 characters, no special characters)
          </p>`
        : html``}
    </main>`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  socket.on('connect', () => {
    console.log(`You connected as ${socket.id}!`);
  });

  socket.on('display-score', (data) => {
    score = data.leaderboard.filter((team: any) => team.team === name)[0].score;
    ping = Math.round(Date.now() - data.ping);
    appContext.update();
  });

  socket.on('disconnect', () => {
    alert('You lost connection (Please reconnect but do not refresh)');
  });
});

render(html`<${App} />`, document.body);
