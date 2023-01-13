import { html, render } from 'hacky';

const problems: any[] = JSON.parse((localStorage.getItem('prev-questions') as any) || '[]');
let cache: any = [];

function* Questions() {
  let selectPointer = 0;

  const mouseCb = () => {
    fetch('https://socket.kbowl.party/generate')
      .then((res) => res.json())
      .then(({ t, q, a }) => {
        cache.unshift({
          title: t.replace(/[^a-z ]/gi, ''),
          question: q,
          answer: `Answer: ${a}`,
        });
      });
  };
  while (true) {
    yield html` <button
        class="btn-small"
        onMouseover=${mouseCb}
        onClick=${async (event: Event) => {
          const el = event.target as HTMLElement;
          el.ariaBusy = 'true';
          // @ts-ignore
          el.disabled = true;
          const cleanup = () => {
            // @ts-ignore
            this.update();
            const select = document.getElementById('question-select') as HTMLSelectElement;
            select.value = String(selectPointer);
            selectPointer = 0;

            // @ts-ignore
            el.disabled = false;
            el.ariaBusy = 'false';

            localStorage.setItem('prev-questions', JSON.stringify([...problems]));
          };
          if (cache.length) {
            const cachedProblem = cache.shift();
            problems.unshift(cachedProblem);
            cleanup();
          } else {
            fetch('https://socket.kbowl.party/generate')
              .then((res) => res.json())
              .then(({ t, q, a }) => {
                problems.unshift({
                  title: t.replace(/[^a-z ]/gi, ''),
                  question: q,
                  answer: `Answer: ${a}`,
                });
                cleanup();
              });
          }
        }}
      >
        Generate (${problems.length} completed)
      </button>

      <select
        id="question-select"
        class="btn-small"
        onChange=${(event: Event) => {
          const el = event.target as HTMLSelectElement;
          const i = Number(el.value);
          selectPointer = i;
          // @ts-ignore
          this.update();
        }}
      >
        <option value="" disabled selected=${problems.length === 0}>Select</option>
        ${problems.map((problem, i) => {
          return html`<option value="${i}" selected=${selectPointer === i}>
            ${problem.title}
          </option>`;
        })}
      </select>
      ${problems.length
        ? html`<div>
        <p>${problems[selectPointer].question}</p>
        <p><b class="blur" onclick=${() => {}}>${problems[selectPointer].answer}</em></p></div>`
        : ''}`;
  }
}

render(
  html`<div className="container">
    <article class="text-center">
      <${Questions} />
      <footer>
        <p>
          <small
            ><em
              >Questions sourced from the${' '}
              <a href="https://kbpractice.com" target="_blank">KBPractice</a> database. Check them
              out if you're interested in live multiplayer Protobowl-like practice with friends.</em
            ></small
          >
        </p>
      </footer>
    </article>
  </div>`,
  document.body,
);
