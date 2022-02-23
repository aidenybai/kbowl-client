import { makeid } from './shared';
import { html, render } from 'hacky';

function App() {
  return html`<div className="container">
    <article>
      <header>
        <div className="headings text-center">
          <h1>KBowl</h1>
          <h2>Conduct oral knowledge bowl online!</h2>
        </div>
      </header>
      <div className="grid">
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
            const room = prompt('Enter room code')?.toUpperCase();
            if (!room || room.length !== 5) return alert('Invalid room code');
            window.location.href = `/buzzer.html?room=${room}`;
          }}
          className="contrast"
        >
          Join room
        </button>
      </div>
      <footer>
        If you want to raise administrative concerns or want to setup KBowl for your tournament,
        please contact <a href="mailto:sam.greene@camas.wednet.edu">Sam Greene</a>.
        <br />
        <br />
        <details>
          <summary>What is this?</summary>
          Kbowl is a virtual web application for hosting oral sessions for knowledge bowl. Kbowl is
          best paired with Zoom for the host narrate questions and regulate the scoreboard. We also
          recommend participants to be muted in the Zoom call, but have another call with their team
          on platforms like Discord or Facetime.
        </details>
        <details>
          <summary>Who works on this?</summary>
          Kbowl is developed by <a href="https://aidenybai.com">Aiden Bai</a> from Camas High
          School. Feel free to contact me if you find any issues or have any suggestions/questions.
          You can actually
          <a href="https://github.com/aidenybai/kbowl-client"> view the source here</a>.
        </details>
        <details>
          <summary>What is the status of KBowl?</summary>
          Kbowl is currently in open beta, there are known issues with lag and the user interface.
          We encourage all participants to be good samaritans and act in good faith when using
          KBowl. Remember, this sort of privilege wouldn't be possible without this platform, so
          abuse it really just ruins it for everyone.
        </details>
      </footer>
    </article>
  </div>`;
}

render(html`<${App} />`, document.body);
