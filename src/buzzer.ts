import '@picocss/pico/css/pico.classless.min.css';
import { html, render } from 'hacky';
import { io } from 'socket.io-client';
import { getRoomCode, delay, play } from './shared';

// @ts-ignore
import buzzSound from './audio/buzz.wav';
// @ts-ignore
import dingSound from './audio/ding.wav';

document.title = `Buzzer (${getRoomCode()}) - kbowl.party`;
render(
  html`<div className="container"><progress indeterminate=${true}></progress></div>`,
  document.body,
);

const socket = io('wss://socket.kbowl.party');

let outOfBrowser = 0;
let ping = 0;
let time = -1;
let connected = false;
let name = localStorage.getItem('name') || '';
let queue: any[] = [];
let leaderboard: any[] = [];
let leaderboardContext: any = undefined;
let oobContext: any = undefined;
let queueContext: any = undefined;
let timerContext: any = undefined;

const isInvalid = (value: string) => {
  return !value || value.length > 25 || /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(value);
};

function* Buzzer() {
  // @ts-ignore
  const [value, setValue] = this.createState(name);
  // @ts-ignore
  const [pause, setPause] = this.createState(0);
  // @ts-ignore
  const [disabled, setDisabled] = this.createState(false);

  while (true) {
    yield html`<input
        type="text"
        onInput=${(event: Event) => {
          const el = event.target as HTMLInputElement;
          const newName = el.value.trim();
          localStorage.setItem('name', newName);
          setValue(newName);
          name = newName;
        }}
        placeholder="Your team name"
        maxlength="25"
        id="name"
        value=${value()}
      />
      <button
        id="buzz"
        className="btn-large"
        onClick=${async (event: Event) => {
          const isInvalidName = isInvalid(value());
          if (isInvalidName)
            return alert('Invalid Name (Max length 25 characters, no special characters');
          document.title = `${value()} (${getRoomCode()}) - kbowl.party`;

          const el = <HTMLButtonElement>event.target;
          el.ariaBusy = 'true';
          el.disabled = true;
          socket.emit('request-buzz', {
            outOfBrowser,
            team: value(),
            ping: Date.now(),
            room: getRoomCode(),
          });
          play(buzzSound);

          setPause(3);
          for (let i = 2; i >= 0; i--) {
            await delay(1000);
            setPause(i);
          }
          el.ariaBusy = 'false';
          el.disabled = false;
        }}
      >
        ${pause() === 0 ? 'BUZZ' : pause()}
      </button>`;
  }
}

function* OutOfBrowser() {
  // @ts-ignore
  oobContext = this;

  while (true) {
    yield html`<p>
      <span>${connected ? '🟢 Connected' : '🔴 Not connected'}</span> to room${' '}
      <code>${getRoomCode()}</code><br />Out of browser time${' '}
      <code data-tooltip="Used to determine cheating">${outOfBrowser} s</code><br />Latency${' '}
      <code data-tooltip="Low value = good connection">${ping} ms</code>
    </p>`;
  }
}

function* Timer() {
  // @ts-ignore
  timerContext = this;

  while (true) {
    yield html`<div className="headings text-center">
      <h1 id="title">${time === -1 ? 'Waiting...' : html`<kbd>${time}</kbd> seconds`}</h1>
      <h2>
        ${queue[0]?.team === name
          ? time <= 0
            ? html`<del>Your turn is up.</del>`
            : html`<mark>YOUR TURN</mark>`
          : 'Not your turn yet'}
      </h2>
    </div>`;
  }
}

function* Leaderboard() {
  // @ts-ignore
  leaderboardContext = this;

  while (true) {
    yield html`<details open>
      <summary>Leaderboard</summary>
      <table role="grid">
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map(
            ({ team, score }: { [key: string]: string | number }) => html`<tr>
              <th scope="row">${team === name ? html`<mark>${team}</mark>` : team}</th>
              <td>${score}</td>
            </tr>`,
          )}
        </tbody>
      </table>
    </details>`;
  }
}

function* Queue() {
  // @ts-ignore
  queueContext = this;

  while (true) {
    yield html`<details open>
      <summary>Queue</summary>
      <table role="grid">
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Data</th>
          </tr>
        </thead>
        <tbody>
          ${queue.map(
            ({ team, time, ping, outOfBrowser }: { [key: string]: string | number }) => html`<tr
              style=${team === name ? 'font-weight: bold' : ''}
            >
              <th scope="row" data-tooltip=${`${outOfBrowser || 0} s out of browser`}>
                ${team === name ? html`<mark>${team}</mark>` : team}
              </th>
              <td data-tooltip="Latency: ${ping} ms">${time}</td>
            </tr>`,
          )}
        </tbody>
      </table>
    </details>`;
  }
}

function* App() {
  while (true) {
    yield html`<div className="container-fluid">
      <div class="grid">
        <article>
          <header>
            <${Timer} />
          </header>
          <${Buzzer} />
        </article>
        <article>
          <header>
            <${Queue} />
          </header>
          <${Leaderboard} />
          <footer className="text-center">
            <${OutOfBrowser} />
          </footer>
        </article>
      </div>
    </div>`;
  }
}

const connect = () => {
  const btn = document.getElementById('buzz')!;
  const title = document.getElementById('title')!;
  if (btn.hasAttribute('data-tooltip')) btn.removeAttribute('data-tooltip');
  if (btn.hasAttribute('aria-busy')) btn.removeAttribute('aria-busy');
  title.textContent = 'Waiting...';
  btn.textContent = 'BUZZ';
  // @ts-ignore
  btn.disabled = false;
  connected = true;
  oobContext.update();
};

const disconnect = () => {
  const btn = document.getElementById('buzz')!;
  const title = document.getElementById('title')!;
  title.textContent = '🚨 You lost connection!';
  btn.textContent = '';
  btn.setAttribute('aria-busy', 'true');
  // @ts-ignore
  btn.disabled = true;
  connected = false;
  oobContext.update();
};

window.addEventListener('DOMContentLoaded', () => {
  const room = getRoomCode()!;
  fetch('https://socket.kbowl.party/info')
    .then((res) => res.json())
    .then((info) => {
      if (!Object.keys(info.pool).includes(room)) {
        window.location.href = '/';
        alert(`Room ${room} doesn't exist!`);
      }
      return info;
    })
    .catch(() => alert('You are not connected.'));

  socket.on('connect', () => {
    console.log(`You connected as ${socket.id}!`);
    connect();
    socket.emit('join-room', { room: getRoomCode(), name: document.getElementById('name') });
  });

  socket.on('display-score', (data) => {
    leaderboard = data.leaderboard;
    queue = data.queue;
    ping = Math.round(Date.now() - data.ping);
    queueContext.update();
    timerContext.update();
    leaderboardContext.update();
  });

  socket.on('display-timer', (data) => {
    time = data.time;
    timerContext.update();
  });

  socket.on('trash-room', (data) => {
    alert(`Room ${data.room} has been closed!`);
    window.location.href = '/';
  });

  socket.on('blocked', (data) => {
    alert(`You're being ratelimited. Please try again in ${data['retry-ms'] / 1000} second(s)`);
  });

  setInterval(() => {
    if (document.visibilityState === 'hidden') {
      outOfBrowser++;
      oobContext.update();
    }
  }, 1000);

  socket.on('disconnect', () => {
    disconnect();
  });

  socket.io.on('reconnect', () => {
    connect();
  });
});

render(html`<${App} />`, document.body);

const input = document.getElementById('name') as HTMLInputElement;
const regex = new RegExp('^[A-Za-z0-9 ]*$');

input.addEventListener('beforeinput', (event) => {
  if (event.data != null && !regex.test(event.data)) event.preventDefault();
});

input.addEventListener('input', () => {
  if (isInvalid(input.value)) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.setAttribute('aria-invalid', 'false');
  }
});
