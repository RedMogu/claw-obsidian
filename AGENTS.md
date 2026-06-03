# AGENTS.md

## What this is

An Obsidian community plugin ("OpenClaw Claw") that opens a WebSocket to an [OpenClaw Gateway](https://openclaw.ai) and provides a sidebar chat view + document sync. TypeScript → bundled `main.js` via esbuild.

## Commands

```bash
npm install          # install deps
npm run build        # tsc -noEmit -skipLibCheck + esbuild production → main.js
npm run dev          # esbuild watch mode
npm run lint         # eslint .
```

## Source layout

- `src/main.ts` (564 lines) — monolithic: `MyPlugin` lifecycle, WebSocket, `ClawView` sidebar UI, `ClawPromptModal`, selection tracking, document sync.
- `src/settings.ts` — settings interface, defaults, settings tab.
- All UI styling is inline in `src/main.ts`; `styles.css` has only layout classes.

## OpenClaw Gateway protocol (non-obvious)

- On `ws.onopen`, send a `connect` handshake: `{ type: "req", id: "1", method: "connect", params: { minProtocol: 3, maxProtocol: 3, scopes: ["operator.write"], ... } }`. Connection is not usable until `isEstablished = true` (response `parsed.type === "res" && parsed.id === "1"`).
- Keep-alive: `health` request every 30 s (`{ type: "req", method: "health" }`). No generic ping method exists.
- Chat send: `{ type: "req", method: "chat.send", params: { message, sessionKey, idempotencyKey } }`.
- **Must filter incoming events by `sessionKey`** — the Gateway broadcasts `agent`/`chat.message` events to *all* clients; without filtering, WhatsApp/Telegram responses leak into the Obsidian view.
- Streaming responses arrive as `{ type: "event", event: "agent", payload: { stream: "assistant", data: { delta } } }`. Document sync uses `_docStreaming` flag: first delta prepends `**[Cat Butler]**: `, subsequent deltas append raw text. Stream-end (`state: "done"`) resets the flag and inserts trailing newline.
- `/askdoc` in chat sends the entire active document or selected text wrapped in a markdown code block as context.

## Obsidian quirks

- Sidebar input steals focus from Markdown editor. `lastActiveEditor` is cached from `active-leaf-change` events — never rely on `getActiveViewOfType(MarkdownView)` at send time.
- Selection comes from three fallbacks: editor selection → native browser selection (Reading mode) → `lastKnownSelection` (ghost tracker via `editor-change` + `mouseup`).
- Register listeners through `registerEvent` / `registerDomEvent` / `registerInterval` for clean unload.

## Stable IDs

- Plugin ID in `manifest.json`: `claw-obsidian` (do not change).
- Command IDs: `open-claw-chat`, `claw-ask-selection` (do not rename).

## Versioning & releases

- Versions live in `package.json`, `manifest.json`, and `versions.json` (maps plugin version → minAppVersion).
- Bump with `npm version <major|minor|patch>` (`.npmrc` sets `tag-version-prefix=""`, so recent git tags omit leading `v`).
- Release artifacts: `main.js`, `manifest.json`, `styles.css`. `main.js` is `.gitignore`d — never committed.

## Style

- Indent with **tabs** (`.editorconfig`).
- Manifest `isDesktopOnly: false` — avoid Node/Electron APIs.

## Testing

Manual only: copy `main.js` + `manifest.json` + `styles.css` to `<vault>/.obsidian/plugins/claw-obsidian/`.
