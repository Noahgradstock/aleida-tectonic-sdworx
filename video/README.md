# Demo film (1 minute, silent)

`make-film.mjs` records the 1-minute pitch video from the real app, frame by frame: a team meeting with the mascot, then Company brain learning from it and answering a colleague a week later. No titles and no music: the team talks over it (script in `docs/pitch-with-video.md`).

- `meeting.html`: a stand-in meeting screen (two participants, live captions). The mascot inside it is the real `mascot/index.html`, driven through a stub of its Electron bridge.
- `stage.html`: the stage and virtual camera (from our pitch video kit).

## Run

1. Local demo accounts for `jan`, `sofie` and `tom`: `node scripts/create-users.mjs jan sofie tom`, put `SESSION_SECRET`, `AUTH_USERS` and `ALLOW_MEMORY_STORE=true` in `.env.local` (never committed).
2. Start the app fresh (the memory store must not know the 22-day claim yet): `npx next dev -p 3200`.
3. In `video/`: `npm install`, `npx playwright install chromium`, then

```bash
DEMO_PASSWORDS="jan:...,sofie:...,tom:..." PREVIEW=1 node make-film.mjs
```

checks the key frames in `out/keys/`, and without `PREVIEW=1` it writes `out/film-silent.mp4` (the committed copy is `video/film-silent.mp4`) (1920×1080, about 6 minutes). Restart the app between runs.

All people, clients and documents are synthetic.
