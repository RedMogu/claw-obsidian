# CLAUDE.md

These rules apply to this project unless the user explicitly overrides them.
Bias toward careful, surgical work on non-trivial changes.

## Working Rules

1. Think before coding. State assumptions when they matter, ask when ambiguity would change the implementation, and push back when a simpler path fits better.
2. Keep changes minimal. Do not add speculative features, broad abstractions, or unrelated cleanup.
3. Touch only what the task requires. Preserve existing formatting and style unless changing it is part of the fix.
4. Define success before implementation. Verify with the narrowest useful command, usually `npm run build` for code changes.
5. Read before writing. Inspect immediate callers, exports, shared utilities, and relevant config before editing.
6. Surface conflicts. If repo patterns contradict, choose the more local or more recent pattern and note the tradeoff.
7. Match the codebase. Conformance beats taste inside this repo.
8. Checkpoint after significant steps. Keep handoffs short: what changed, what was verified, what remains.

## Project Snapshot

This is an Obsidian community plugin for OpenClaw. It bundles TypeScript from `src/main.ts` into root-level `main.js` with esbuild.

Release artifacts are `main.js`, `manifest.json`, and optional `styles.css`, but generated files such as `main.js`, `node_modules/`, archives, and release output should not be committed.

## Tooling

- Package manager: npm.
- Install dependencies with `npm install`.
- Run production build/check with `npm run build`.
- Run watch mode with `npm run dev`.
- Run linting with `npm run lint`.
- Do not use `uv`, `pip`, or Python dependency workflows for this project unless a future task explicitly introduces Python tooling.

## Current Architecture

- `src/main.ts` contains most plugin behavior:
  - `ClawPromptModal` for prompting against selected text.
  - `ClawView` for the right-sidebar chat UI.
  - `MyPlugin` for lifecycle, WebSocket connection management, commands, selection tracking, and document sync.
- `src/settings.ts` defines `MyPluginSettings`, `DEFAULT_SETTINGS`, and the settings tab.
- `styles.css` is currently only the sample placeholder; most runtime UI styling is inline in `src/main.ts`.

Prefer extracting focused modules from `src/main.ts` before adding much more behavior there, but do not refactor unrelated code just because the file is large.

## OpenClaw Gateway Notes

- The plugin uses a browser `WebSocket` connection to `settings.gatewayUrl`, appending `?token=...` when `authToken` is set.
- On open, it sends a `connect` request with protocol `3` and `operator.write` scope.
- Keep-alive uses the Gateway `health` request every 30 seconds; do not replace it with a generic ping method.
- Chat sends use `{ type: "req", method: "chat.send", params: { message, sessionKey, idempotencyKey } }`.
- Incoming events must be filtered by `sessionKey` to avoid showing responses intended for other clients.
- Assistant streaming events arrive through `agent` payloads with assistant deltas; document sync uses `_docStreaming` to prepend `**[Cat Butler]**:` once per stream.

## Obsidian Behavior Notes

- The sidebar steals focus from the Markdown editor, so `lastActiveEditor` is cached from `active-leaf-change`.
- Selected text can come from the editor, native browser selection in Reading mode, or `lastKnownSelection`.
- Register listeners through Obsidian helpers (`registerEvent`, `registerDomEvent`, `registerInterval`) so unload stays clean.
- Avoid Node/Electron APIs unless `manifest.json` is changed to desktop-only.
- Keep startup light; avoid expensive vault scans or heavy work in `onload`.

## Stable IDs

Keep these command IDs stable:

- `open-claw-chat`
- `claw-ask-selection`

The plugin id in `manifest.json` is `claw-obsidian`; do not change it after release.

## Git And Releases

- Do not commit directly to `main` when working on issue-driven changes unless the user explicitly asks.
- Use branch names that describe the work, such as `fix-<desc>` or `issue-N-<desc>`.
- When bumping releases, keep `package.json`, `manifest.json`, and `versions.json` in sync.
- GitHub release tags for Obsidian should match `manifest.json` version exactly, without a leading `v`.
