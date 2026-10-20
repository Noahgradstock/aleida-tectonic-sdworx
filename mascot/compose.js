// Demo email: reports the text to the mascot after a short pause in typing, and applies its fixes.
const body = document.getElementById("body");
let timer;

body.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => window.compose.changed(body.value), 900);
});

window.compose.onReplace((from, to) => {
  if (!body.value.includes(from)) return;
  body.value = body.value.replace(from, to);
  window.compose.changed(body.value);
});
