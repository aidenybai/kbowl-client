import '@picocss/pico/css/pico.classless.min.css';
import { html, render } from 'hacky';
import { io } from 'socket.io-client';
import { getRoomCode, say, play } from './shared';
// @ts-ignore
import DOMPurify from 'dompurify';
// @ts-ignore
import dingSound from './audio/ding.wav';

document.title = `Host (${getRoomCode()}) - KBowl`;
render('Connecting to server...', document.body);

const socket = io('wss://kbowl-server.aidenybai.com');

if (!(<any>localStorage.getItem(getRoomCode()!)))
  localStorage.setItem(getRoomCode()!, JSON.stringify({ queue: [], leaderboard: [] }));
let leaderboard: any[] = JSON.parse(<any>localStorage.getItem(getRoomCode()!)).leaderboard ?? [];
let queue: any[] = JSON.parse(<any>localStorage.getItem(getRoomCode()!)).queue ?? [];

let loaded = false;
let time = -1;
let locked = false;
let interval: any = undefined;
let infoContext: any = undefined;
let timerContext: any = undefined;
let leaderboardContext: any = undefined;
let queueContext: any = undefined;

const update = () => {
  localStorage.setItem(
    getRoomCode()!,
    JSON.stringify({
      queue,
      leaderboard,
    }),
  );

  socket.emit('update-score', { leaderboard, queue, ping: Date.now() });
  infoContext.update();
  timerContext.update();
  leaderboardContext.update();
  queueContext.update();
};

const startCountdown = () => {
  if (interval) clearInterval(interval);
  time = 15;
  interval = setInterval(() => {
    time--;
    if (time === 0) {
      clearInterval(interval);
      interval = undefined;
      say(`${queue[0].team}, time up!`);
    }
    update();
  }, 1000);
};

const stopCountdown = () => {
  clearInterval(interval);
  interval = undefined;
  time = -1;
};

function* Info() {
  // @ts-ignore
  infoContext = this;
  while (true) {
    yield html`<div className="headings text-center">
      <h1>Room <code>${getRoomCode()}</code></h1>
      <h2>
        ${leaderboard.length === 1 ? `${leaderboard.length} team` : `${leaderboard.length} teams`}
        ${' '}in the room
      </h2>
    </div>`;
  }
}

function* Timer() {
  // @ts-ignore
  timerContext = this;
  while (true) {
    yield html`<div className="headings text-center">
      <h1>${time === -1 ? 'Waiting for buzzes...' : html`<code>${time}</code> seconds`}</h1>
      <h2>${queue.length === 1 ? `${queue.length} team` : `${queue.length} teams`} buzzed in</h2>
    </div>`;
  }
}

function* Leaderboard() {
  // @ts-ignore
  leaderboardContext = this;
  while (true) {
    yield html`<table role="grid">
      <thead>
        <tr>
          <th scope="col">Team</th>
          <th scope="col">Score</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${leaderboard.map(
          ({ team, score }: { [key: string]: string | number }, i) => html`<tr>
            <th scope="row">${team}</th>
            <td>${score}</td>
            <td>
              <a
                onClick=${(event: Event) => {
                  event.preventDefault();
                  if (!confirm(`Are you sure you want to delete ${team}?`)) return;
                  leaderboard.splice(i, 1);
                  queue = queue.filter((queueTeam) => queueTeam.team !== team);
                  update();
                }}
                href="#"
                role="button"
                className="secondary btn-small"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="{2}"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </a>
            </td>
          </tr>`,
        )}
      </tbody>
    </table>`;
  }
}

function* Lock() {
  while (true) {
    yield html`<a
      onClick=${(event: Event) => {
        event.preventDefault();
        locked = !locked;
        // @ts-ignore
        this.update();
      }}
      href="#"
      role="button"
      data-tooltip="Disallow new teams to buzz and enter the room, but allow existing teams to buzz"
      className="${locked ? 'contrast' : 'secondary'} btn-small"
      >${locked ? 'Unlock' : 'Lock'} Room</a
    >`;
  }
}

function* Queue() {
  // @ts-ignore
  queueContext = this;
  while (true) {
    yield html`<table role="grid">
      <thead>
        <tr>
          <th scope="col">Team</th>
          <th scope="col">Data</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${queue.map(
          ({ team, time, ping }: { [key: string]: string | number }, i) => html`<tr>
            <th scope="row">${team}</th>
            <td>${time} <code>${ping} ms</code></td>
            <td>
              <a
                onClick=${(event: Event) => {
                  event.preventDefault();
                  queue = [];
                  leaderboard.filter((leaderboardTeam) => leaderboardTeam.team === team)![0]
                    .score++;
                  leaderboard.sort((a, b) => b.score - a.score);
                  stopCountdown();
                  update();
                }}
                href="#"
                role="button"
                className="contrast btn-small"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  className="icon"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="{2}"
                    d="M5 13l4 4L19 7"
                  />
                </svg> </a
              >${' '}
              <a
                onClick=${(event: Event) => {
                  event.preventDefault();
                  queue.splice(i, 1);
                  if (queue.length === 0) {
                    stopCountdown();
                  } else {
                    startCountdown();
                  }
                  update();
                }}
                href="#"
                role="button"
                className="secondary btn-small"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  className="icon"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </a>
            </td>
          </tr>`,
        )}
      </tbody>
    </table>`;
  }
}

function* App() {
  while (true) {
    yield html`<main className="container">
      <div class="grid">
        <div>
          <${Timer} />
          <div>
            <details open>
              <summary className="text-center">Queue</summary>
              <${Queue} />
            </details>
          </div>
          <div className="text-center">
            <a
              onClick=${(event: Event) => {
                event.preventDefault();
                queue = [];
                if (queue.length === 0) {
                  stopCountdown();
                }

                update();
              }}
              href="#"
              role="button"
              data-tooltip="Make a mistake? Clears the queue"
              className="secondary btn-small"
              >Clear Queue</a
            >${' '}
            <a
              onClick=${(event: Event) => {
                event.preventDefault();
                time = 15;
                update();
                startCountdown();
              }}
              href="#"
              role="button"
              data-tooltip="Manually reset timer to 15 seconds and start countdown"
              className="secondary btn-small"
              >Reset Timer</a
            >
          </div>
        </div>
        <div>
          <${Info} />
          <div>
            <details open>
              <summary className="text-center">Leaderboard</summary>
              <${Leaderboard} />
            </details>
          </div>
          <div className="text-center">
            <${Lock} />${' '}<a
              onClick=${(event: Event) => {
                event.preventDefault();
                leaderboard = [];
                queue = [];
                update();
              }}
              href="#"
              role="button"
              data-tooltip="Clears saved data (resets data, only use if you see existing data you don't want)"
              className="secondary btn-small"
              >Hard Reset</a
            >
          </div>
        </div>
      </div>
    </main>`;
  }
}

const claim = () => {
  socket.emit('claim-room', { room: getRoomCode(), id: socket.id });
};

const unclaim = () => {
  socket.emit('unclaim-room', { room: getRoomCode() });
};

window.addEventListener('DOMContentLoaded', () => {
  socket.on('confirm-room', (data) => {
    if (loaded) return;
    if (data.canAdd) {
      render(html`<${App} />`, document.body);
      loaded = true;
    } else {
      alert('Someone else has claimed this room. Please create a new room.');
      window.location.href = '/';
    }
  });

  socket.on('connect', () => {
    console.log(`You connected as ${socket.id}!`);
    claim();
  });

  socket.on('display-buzz', (data) => {
    if (data.room !== getRoomCode()) return;
    const hasTeamRegistered = leaderboard.some(
      (team: { [key: string]: string | number }) => team.team === DOMPurify.sanitize(data.team),
    );
    const hasTeamBuzzed = queue.some(
      (team: { [key: string]: string | number }) => team.team === DOMPurify.sanitize(data.team),
    );
    if (!hasTeamRegistered) {
      if (locked) return;
      leaderboard.push({
        team: DOMPurify.sanitize(data.team),
        score: 0,
      });
      leaderboard.sort((a, b) => b.score - a.score);
    }
    if (!hasTeamBuzzed) {
      play(dingSound);
      queue.push({
        team: DOMPurify.sanitize(data.team),
        ping: Math.round(Date.now() - DOMPurify.sanitize(data.ping)),
        createdAt: DOMPurify.sanitize(data.ping),
        time: new Date().toLocaleTimeString(),
      });
      if (Date.now() - data.ping > 0) {
        queue.sort((a, b) => a.createdAt - b.createdAt);
      }
    }

    startCountdown();
    update();
  });

  socket.on('disconnect', () => {
    unclaim();
    alert('You lost connection (Please reconnect but do not refresh)');
  });

  socket.io.on('reconnect', () => {
    claim();
  });
});

window.addEventListener('beforeunload', (event) => {
  event.preventDefault();
  event.returnValue = '';

  unclaim();

  return null;
});
