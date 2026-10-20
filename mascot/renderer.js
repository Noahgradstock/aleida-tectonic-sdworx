// Mascot states. Calm is silent; thinking and warning show a short message.
const stage = document.getElementById("stage");
const bubble = document.getElementById("bubble");

const STATES = {
  calm: "",
  thinking: "Checking that against the brain…",
  warning: "€6.91 is outdated. Trusted value: €8.91 (royal decree, in force since 1 Jan 2026).",
};
const order = Object.keys(STATES);
let current = "calm";

function setState(state) {
  current = state;
  stage.className = `stage ${state}`;
  bubble.textContent = STATES[state];
  bubble.classList.toggle("show", Boolean(STATES[state]));
}

window.mascot.onCycle(() => setState(order[(order.indexOf(current) + 1) % order.length]));
setState("calm");
