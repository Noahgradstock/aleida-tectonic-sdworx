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
| **Online switch** in the card (or `Cmd+Shift+L`) | **Offline** (default): the blob sleeps, sees and hears nothing. **Online**: it reads the text field you are typing in (Mail, Outlook, Teams chat, via macOS Accessibility) and listens to your microphone. Wrong values you write or say make it warn. Say **"Hey SD Worx, …"** to ask; it answers on screen and out loud. Small talk ("how are you", "what's your name") gets fixed, friendly replies |
| `Cmd+Shift+E` (backup) | Opens a demo email window. Write e.g. "the employer part of the meal voucher is €6.91". After a short pause the mascot turns amber and warns; "Fix it" replaces the value |

Clicks pass through the transparent area around the blob, so it never blocks the apps underneath.

## How the check works

At start the mascot loads every trusted fact from the engine (`/api/trust/facts`, refreshed every 5 minutes), so checks run locally and instantly. Deterministic, no AI in the decision: a sentence that states a value (€, %, hours, weeks, months, days, times) is matched to a fact by its keywords; if the fact is trusted and the stated value has the same unit but a different number, the mascot warns. In Apple Mail it reads the open compose window (macOS asks once for Automation permission); in other apps it reads the focused text field (Accessibility). "Fix it" in Mail copies the trusted value to the clipboard. See `DEMO.md` for sentences to try.

## Voice

Listening uses voice-activity detection: an utterance is sent as soon as you pause (0.65 s of silence), silence is never sent, and the mascot stops listening while it is talking. Answers are cached for the session and the brain connection is warmed up at start.


Put `ELEVENLABS_API_KEY` (and optionally `ELEVENLABS_VOICE_ID`) in the repo's `.env`. Speech-to-text uses ElevenLabs Scribe, replies use ElevenLabs text-to-speech. Without a key the mascot cannot listen, and replies fall back to the macOS voice.

## Security

- Renderer pages run with `contextIsolation`, `sandbox`, no `nodeIntegration`, a strict Content-Security-Policy, and no navigation or new windows.
- Only the main process talks to the network, and only to `BRAIN_URL` and the ElevenLabs API. The ElevenLabs key never reaches a page.
- Only the hidden meeting listener window may use the microphone; audio segments are size- and type-checked and are not stored. Every IPC message checks which window sent it and validates its input.
- The demo email never leaves the device except the sentences checked against the trust engine.

## Unfinished

- The email window is a demo; real Outlook or Gmail integration (Microsoft Graph, OAuth) is not built.
- Meeting mode hears your microphone only, not the other participants (that needs system-audio capture).
- The Email toggle depends on the app exposing its text field to Accessibility; some web-based editors do not. The demo email window always works.
- The case context is fixed to Belgium, PC 200.
