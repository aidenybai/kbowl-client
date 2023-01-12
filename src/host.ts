import '@picocss/pico/css/pico.classless.min.css';
import { html, render } from 'hacky';
import { io } from 'socket.io-client';
import { getRoomCode, say, play } from './shared';
// @ts-ignore
import DOMPurify from 'dompurify';
// @ts-ignore
import dingSound from './audio/ding.wav';

document.title = `Host (${getRoomCode()}) - kbowl.party`;
document.getElementById('room-code')!.textContent = getRoomCode();
document.getElementById('copy')!.addEventListener('click', () => {
  navigator.clipboard.writeText(getRoomCode()!).then(
    () => {
      console.log('copied to clipboard');
    },
    (err) => {
      console.error('Async: Could not copy text: ', err);
    },
  );
});
render(
  html`<div className="container"><progress indeterminate=${true}></progress></div>`,
  document.body,
);

const socket = io('wss://socket.kbowl.party');

if (!(<any>localStorage.getItem(getRoomCode()!)))
  localStorage.setItem(getRoomCode()!, JSON.stringify({ queue: [], leaderboard: [] }));
let leaderboard: any[] = JSON.parse(<any>localStorage.getItem(getRoomCode()!)).leaderboard ?? [];
let queue: any[] = JSON.parse(<any>localStorage.getItem(getRoomCode()!)).queue ?? [];

let loaded = false;
let globalTime = -1;
let locked = false;
let connected = false;
let users = [];
const activityLog: any[] = [];
const problems: any[] = [];
let interval: any = undefined;
let infoContext: any = undefined;
let timerContext: any = undefined;
let leaderboardContext: any = undefined;
let queueContext: any = undefined;
let logContext: any = undefined;
let questionsContext: any = undefined;

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
  logContext.update();
  questionsContext.update();
};

const startCountdown = () => {
  if (interval) clearInterval(interval);
  globalTime = 15;
  socket.emit('update-timer', { time: globalTime });
  interval = setInterval(() => {
    globalTime--;
    socket.emit('update-timer', { time: globalTime });
    update();
    if (globalTime === 0) {
      clearInterval(interval);
      interval = undefined;
      say(`time's up!`);
    }
  }, 1000);
};

const stopCountdown = () => {
  clearInterval(interval);
  interval = undefined;
  globalTime = -1;
  socket.emit('update-timer', { time: globalTime });
};

function* Info() {
  // @ts-ignore
  infoContext = this;
  while (true) {
    yield html`<div className="headings text-center">
      <h1
        onclick=${() => {
          (document.getElementById('modal') as any).setAttribute('open', 'open');
        }}
      >
        Room <kbd>${getRoomCode()}</kbd>
      </h1>
      <h2>
        <table>
          <tbody>
            <tr style="font-size: 1rem !important">
              <td class="text-center" data-tooltip="# of confirmed teams">
                ${leaderboard.length} 👥
              </td>
              <td class="text-center" data-tooltip="# of connected users">${users.length} 👤</td>
              <td class="text-center">${connected ? '🟢 Connected' : '🔴 No connection'}</td>
            </tr>
          </tbody>
        </table>
      </h2>
    </div>`;
  }
}

function* Timer() {
  // @ts-ignore
  timerContext = this;
  while (true) {
    yield html`<div className="headings text-center">
      <h1>
        ${globalTime === -1 ? 'Waiting for buzzes...' : html`<kbd>${globalTime}</kbd> seconds`}
      </h1>
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
                  const answer = prompt(
                    `What is the new score for ${team}? (Original Score: ${score})`,
                  );
                  if (answer === null || isNaN(answer as any)) return;
                  leaderboard[i].score = Number(answer);
                  leaderboard.sort((a, b) => b.score - a.score);
                  activityLog.unshift(`📝 Change ${team}' score: ${score} -> ${answer}`);
                  update();
                }}
                href="#"
                role="button"
                className="primary outline btn-small"
                data-tooltip="Edit score"
              >
                📝 </a
              >${' '}
              <a
                onClick=${(event: Event) => {
                  event.preventDefault();
                  if (!confirm(`Are you sure you want to delete ${team}?`)) return;
                  leaderboard.splice(i, 1);
                  activityLog.unshift(`🗑️ Delete ${team}`);
                  queue = queue.filter((queueTeam) => queueTeam.team !== team);
                  update();
                }}
                href="#"
                role="button"
                className="primary outline btn-small"
                data-tooltip="Delete team"
              >
                🗑️
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
        activityLog.unshift(`${locked ? '🔓 Unlocked' : '🔒 Locked'} room`);
        locked = !locked;
        // @ts-ignore
        this.update();
        logContext.update();
      }}
      href="#"
      role="button"
      data-tooltip="Disallow new teams to buzz and enter the room"
      className="${locked ? 'contrast' : 'primary'} btn-small"
      >${locked ? '🔓 Unlock' : '🔒 Lock'} Room</a
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
        ${queue.map(({ team, time, ping, outOfBrowser }: { [key: string]: string | number }, i) => {
          return html`<tr>
            <th scope="row" data-tooltip=${`${outOfBrowser || 0} s out of browser`}>
              ${i === 0 ? html`<mark>${String(team)}</mark>` : team}
            </th>
            <td data-tooltip="Latency: ${ping} ms">${time}</td>
            <td>
              <a
                onClick=${(event: Event) => {
                  event.preventDefault();
                  queue = [];
                  leaderboard.filter((leaderboardTeam) => leaderboardTeam.team === team)![0]
                    .score++;
                  leaderboard.sort((a, b) => b.score - a.score);
                  activityLog.unshift(`✅ ${team}`);
                  stopCountdown();
                  update();
                }}
                href="#"
                role="button"
                className="primary outline btn-small"
                data-tooltip="Mark correct"
              >
                ✅ </a
              >${' '}
              <a
                onClick=${(event: Event) => {
                  event.preventDefault();
                  activityLog.unshift(`❌ ${team}`);
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
                className="primary outline btn-small"
                data-tooltip="Remove team from queue"
              >
                ❌
              </a>
            </td>
          </tr>`;
        })}
      </tbody>
    </table>`;
  }
}

function* BuzzedIn() {
  // @ts-ignore
  logContext = this;

  while (true) {
    yield html`<details>
      <summary>Activity Log <sub>${activityLog.length}</sub></summary>
      <ul style="overflow-y: scroll; height: 10rem;">
        ${activityLog.map((buzz) => html`<li><small>${buzz}</small></li>`)}
      </ul>
    </details>`;
  }
}

let selectPointer = 0;
function* Questions() {
  // @ts-ignore
  questionsContext = this;

  while (true) {
    yield html`<details>
      <summary>Practice Questions</summary>
      <br />
      <button
        class="btn-small"
        onClick=${async (event: Event) => {
          const el = event.target as HTMLElement;
          el.ariaBusy = 'true';
          // @ts-ignore
          el.disabled = true;
          fetch('https://socket.kbowl.party/generate')
            .then((res) => res.json())
            .then(({ t, q, a }) => {
              problems.unshift({
                title: t.replace(/[^a-z ]/gi, ''),
                question: q,
                answer: `Answer: ${a}`,
              });
              questionsContext.update();
              const select = document.getElementById('question-select') as HTMLSelectElement;
              select.value = String(selectPointer);
              selectPointer = 0;

              setTimeout(() => {
                // @ts-ignore
                el.disabled = false;
                el.ariaBusy = 'false';
              }, 3000);
            });
        }}
      >
        Generate
      </button>

      <select
        id="question-select"
        class="btn-small"
        onChange=${(event: Event) => {
          const el = event.target as HTMLSelectElement;
          const i = Number(el.value);
          selectPointer = i;
          questionsContext.update();
        }}
      >
        <option value="" disabled selected>Select</option>
        ${problems.map((problem, i) => {
          return html`<option value="${i}">${problem.title}</option>`;
        })}
      </select>
      ${problems.length
        ? html`<blockquote>
        <p>${problems[selectPointer].question}</p>
        <p><b class="blur" onclick=${() => {}}>${problems[selectPointer].answer}</em></p></blockquote>`
        : ''}

      <p>
        <small
          ><em
            >Questions sourced from the${' '}
            <a href="https://kbpractice.com" target="_blank">KBPractice</a> database.</em
          ></small
        >
      </p>
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
          <div>
            <details open>
              <summary>Queue</summary>
              <${Queue} />
              <${Questions} />
              <${BuzzedIn} />
            </details>
          </div>
          <footer className="text-center">
            <a
              onClick=${(event: Event) => {
                event.preventDefault();
                queue = [];
                if (queue.length === 0) {
                  stopCountdown();
                }
                activityLog.unshift('🌊 Cleared Queue');

                update();
              }}
              href="#"
              role="button"
              data-tooltip="Make a mistake? Clears the queue"
              className="primary btn-small"
              >🌊 Clear Queue</a
            >${' '}
            <a
              onClick=${(event: Event) => {
                event.preventDefault();
                globalTime = 15;
                activityLog.unshift('⏲️ Reset Timer');
                update();
                startCountdown();
              }}
              href="#"
              role="button"
              data-tooltip="Manually reset timer to 15 seconds and start countdown"
              className="primary btn-small"
              >⏲️ Reset Timer</a
            >
          </footer>
        </article>
        <article>
          <header>
            <${Info} />
          </header>
          <div>
            <details open>
              <summary>Leaderboard</summary>
              <${Leaderboard} />
            </details>
          </div>
          <footer className="text-center">
            <${Lock} />${' '}<a
              onClick=${(event: Event) => {
                event.preventDefault();
                if (!confirm('Are you sure? This will close the room to all connected users.'))
                  return;
                leaderboard = [];
                queue = [];
                localStorage.removeItem(getRoomCode()!);
                update();
                window.location.href = '/';
              }}
              href="#"
              role="button"
              data-tooltip="Closes room for everyone"
              className="primary btn-small outline"
              >⚠️ Close Room</a
            >
          </footer>
        </article>
      </div>
    </div>`;
  }
}

const claim = () => {
  socket.emit('claim-room', { room: getRoomCode(), id: socket.id });
};

// const unclaim = () => {
//   socket.emit('unclaim-room', { room: getRoomCode() });
// };

window.addEventListener('DOMContentLoaded', () => {
  socket.on('confirm-room', (data) => {
    if (loaded) return;
    if (data.canAdd || data.sameAddress) {
      connected = true;
      render(html`<${App} />`, document.body);
      if (queue.length || leaderboard.length) update();
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

  socket.on('display-join', (data) => {
    if (data.room !== getRoomCode()) return;
    users = data.users || [];
    activityLog.unshift(`👤 user joined`);
    update();
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
        team: DOMPurify.sanitize(data.team).substring(0, 25),
        ping: Math.round(Date.now() - DOMPurify.sanitize(data.ping)),
        createdAt: DOMPurify.sanitize(data.ping),
        time: new Date().toLocaleTimeString(),
        outOfBrowser: DOMPurify.sanitize(data.outOfBrowser),
      });
      if (Date.now() - data.ping > 0) {
        queue.sort((a, b) => a.createdAt - b.createdAt);
      }
      activityLog.unshift(`👋 ${DOMPurify.sanitize(data.team)} buzzed`);
      logContext.update();
      if (queue.length === 1) {
        startCountdown();
      }
      update();
    }
  });

  socket.on('disconnect', () => {
    connected = false;
    infoContext.update();
  });

  socket.io.on('reconnect', () => {
    connected = true;
    infoContext.update();
  });
});

window.addEventListener('beforeunload', (event) => {
  event.preventDefault();
  event.returnValue = '';

  return null;
});
