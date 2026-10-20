# Company brain mascot (desktop)

A small blob in an SD Worx cap that lives in the corner of the screen, always on top. It stays calm and silent while everything is fine, and only asks for attention when something you write does not match trusted knowledge.

It uses the deployed Company brain trust engine (`/api/trust/ask`, read-only guest session). Set `BRAIN_URL` to point at another deployment, e.g. `BRAIN_URL=http://localhost:3000 npm start`.

## Run it (macOS)

```bash
cd mascot
npm install
npm start
```

| Action | What happens |
|---|---|
| Click the blob (or `Cmd+Shift+M`) | Opens the card: ask a payroll question, get the trusted answer, score, source and expert |
| Drag the blob | Moves it anywhere on screen |
| `Cmd+Shift+E` or "Open demo email" | Opens a demo email window. Write e.g. "the employer part of the meal voucher is €6.91". After a short pause the mascot turns amber and warns; "Fix it" replaces the value |

Clicks pass through the transparent area around the blob, so it never blocks the apps underneath.

## How the email check works

Deterministic, no AI in the decision: each sentence that states a value (€, %, days, weeks, months) is sent to the trust engine, which matches the topic and returns the trusted answer. If the answer is trusted and the sentence's value differs, the mascot warns.

## Security

- Renderer pages run with `contextIsolation`, `sandbox`, no `nodeIntegration`, a strict Content-Security-Policy, and no navigation or new windows.
- Only the main process talks to the network, and only to `BRAIN_URL`. Every IPC message checks which window sent it and validates its input.
- The demo email never leaves the device except the sentences checked against the trust engine.

## Unfinished

- The email window is a demo; real Outlook or Gmail integration (Microsoft Graph, OAuth) is not built.
- Meetings and voice (speech-to-text, "Hey SD Worx", ElevenLabs voice replies) are not built yet.
- The case context is fixed to Belgium, PC 200.
