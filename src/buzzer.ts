import '@picocss/pico/css/pico.classless.min.css';
import { html, render } from 'hacky';
import { io } from 'socket.io-client';
import { getRoomCode, delay, play } from './shared';

// @ts-ignore
import buzzSound from './audio/buzz.wav';

document.title = `Buzzer (${getRoomCode()}) - KBowl`;
render(
  html`<div className="container"><progress indeterminate=${true}></progress></div>`,
  document.body,
);

const socket = io('wss://kbowl-server.aidenybai.com');

let score = 0;
let outOfBrowser = 0;
let ping = 0;
let name = '';
let queue: any[] = [];
let leaderboard: any[] = [];
let scoreContext: any = undefined;
let leaderboardContext: any = undefined;
let oobContext: any = undefined;
let queueContext: any = undefined;

function* Buzzer() {
  // @ts-ignore
  const [value, setValue] = this.createState(name);
  // @ts-ignore
  const [pause, setPause] = this.createState(0);
  // @ts-ignore
  const [disabled, setDisabled] = this.createState(false);

  while (true) {
    yield html`<input
        onInput=${(event: Event) => {
          const newName = (<HTMLInputElement>event.target!).value.trim();
          setValue(newName);
          name = newName;
        }}
      />
      <button
        className="btn-large"
        onClick=${async (event: Event) => {
          const isInvalidName =
            !value() ||
            value().length > 25 ||
            /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(value());
          if (isInvalidName)
            return alert('Invalid Name (Max length 25 characters, no special characters');

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

function* Score() {
  // @ts-ignore
  scoreContext = this;

  while (true) {
    yield html`<div className="headings text-center">
      <h1>Score <code>${score}</code></h1>
      <h2>Connected to room <code>${getRoomCode()}</code> <code>${ping} ms</code></h2>
    </div>`;
  }
}

function* OutOfBrowser() {
  // @ts-ignore
  oobContext = this;

  while (true) {
    yield html`<p>Out of browser time <code>${outOfBrowser} s</code></p>`;
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
              <th scope="row">${team}</th>
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
            ({ team, time, ping, outOfBrowser }: { [key: string]: string | number }) => html`<tr>
              <th scope="row" data-tooltip=${`${outOfBrowser || 0} s out of browser`}>${team}</th>
              <td>${time} <code>${ping} ms</code></td>
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
            <${Score} />
          </header>
          <${Buzzer} />
          <footer className="text-center">
            <${OutOfBrowser} />
          </footer>
        </article>
        <article>
          <header>
            <${Leaderboard} />
          </header>
          <${Queue} />
        </article>
      </div>
    </div>`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  socket.on('connect', () => {
    console.log(`You connected as ${socket.id}!`);
  });

  socket.on('display-score', (data) => {
    score = data.leaderboard.filter((team: any) => team.team === name)[0].score;
    leaderboard = data.leaderboard;
    queue = data.queue;
    ping = Math.round(Date.now() - data.ping);
    scoreContext.update();
    queueContext.update();
    leaderboardContext.update();
  });

  setInterval(() => {
    if (document.visibilityState === 'hidden') {
      outOfBrowser++;
      oobContext.update();
    }
  }, 1000);

  socket.on('disconnect', () => {
    alert('You lost connection (Please reconnect but do not refresh)');
  });
});

render(html`<${App} />`, document.body);
