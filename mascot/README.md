# Company brain mascot (desktop)

A small blob that lives in the corner of the screen, always on top. It stays calm and silent while everything is fine, and only asks for attention when something you are writing does not match trusted knowledge.

## Run it (macOS)

```bash
cd mascot
npm install
npm start
```

- Drag the blob anywhere.
- `Cmd+Shift+M` cycles the demo states: calm (green) → thinking (blue) → warning (amber, with a badge and a message).
- Quit with `Ctrl+C` in the terminal.

## Security

`contextIsolation`, `sandbox` and no `nodeIntegration` in the renderer; a strict Content-Security-Policy; no navigation or new windows. The page only gets one IPC channel (`mascot:cycle`) through `preload.js`.

## Unfinished

- The warning text is a fixed demo message. Next: a question bubble and a compose check wired to `/api/trust/ask`.
