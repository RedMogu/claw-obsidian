# OpenClaw Claw - Obsidian Native Plugin

This is an Obsidian plugin designed to act as a native client for your [OpenClaw](https://openclaw.ai) Sovereign AI system. 

It completely bypasses traditional file-syncing methods (like iCloud or Google Drive) and establishes a direct **WebSocket** connection to your remote OpenClaw Gateway. This allows your personal AI Butler to live directly inside your Obsidian sidebar, enabling real-time, zero-latency collaboration.

## 🚀 Features

- **Native Sidebar Chat**: Adds a `Claw Chat` view to your Obsidian right sidebar.
- **Smart Dual-Write (v1.0.31+)**: Conversations are rendered beautifully in the sidebar **and** automatically streamed directly into your currently active Markdown document.
- **Clean Markdown Formatting**: Your AI's responses are injected into your document using a clean, list-friendly horizontal rule (`---`) format.
- **Direct WebSocket Link**: Connects directly to your OpenClaw Gateway using the `health` protocol for robust keep-alive.
- **Session Isolation**: Fully isolated chat context via customizable `Session Key` so your notes don't leak into your main WhatsApp/Telegram threads.

## 🛠️ Installation & Setup

Since your OpenClaw Gateway is likely running on a remote server (e.g., an Azure VM) and your Obsidian is local (e.g., your Mac), this plugin defaults to connecting via a Tailscale IP.

### 1. Prerequisites
- You must have [Tailscale](https://tailscale.com/) installed and connected on the machine running Obsidian.
- Your OpenClaw Gateway must be running and bound to its LAN/Tailscale IP (`gateway.bind: "lan"` in `openclaw.json`).

### 2. Download and Install
1. Go to the [Releases](https://github.com/RedMogu/claw-obsidian/releases) page and download the latest `claw-obsidian-vX.X.X.tar.gz`.
2. Extract the `claw-obsidian` folder into your Obsidian vault's plugin directory:
   `YourVaultName/.obsidian/plugins/`
3. If the folder `.obsidian` is hidden on your Mac, press `Cmd + Shift + .` in Finder to reveal it.

### 3. Enable and Configure
1. Open Obsidian and go to **Settings > Community plugins**.
2. If Safe Mode is ON, turn it OFF to allow local plugins.
3. Scroll down to **Installed plugins** and toggle the switch for **OpenClaw Claw** to ON.
4. Click the **gear icon** ⚙️ next to the plugin to open its settings:
   - **Gateway URL**: Set this to your Gateway's WebSocket address (e.g., `ws://100.x.y.z:18789`).
   - **Gateway Auth Token**: Paste your Gateway access token here.
   - **Session Key**: Leave as default (`agent:main:obsidian`) to keep your Obsidian chats separate from your other clients.
5. Look at the left ribbon (the vertical toolbar). Click the **Open Claw Chat** icon (message bubble).
6. A new chat panel will open in your right sidebar. 


### 4. Gateway Server Configuration (Important)
For the Obsidian plugin to establish a WebSocket connection via the browser environment, you **must** configure your OpenClaw Gateway to allow connections from the Obsidian app's internal origin.

Open your `openclaw.json` on the server and add the following to the `gateway` section:
```json
"gateway": {
  "controlUi": {
    "allowedOrigins": [
      "https://moltbot.redmogu.org",
      "app://obsidian.md",
      "null"
    ]
  }
}
```
Restart the gateway after making this change.

## 📝 Document Formatting

When you chat with the AI using the sidebar, the conversation is automatically streamed into the last Markdown document you clicked on. The format looks like this:

```markdown
---
**[主人]**: Write me a python script to parse JSON. (2026-03-07 17:40 UTC)
**[Cat Butler]**: Here is your script:
(Code block and markdown rendered normally)

---
```

## 🔄 Recent Updates
- **v1.0.31**: Changed document insertion format from blockquotes to a cleaner horizontal rule (`---`) separation between conversation turns to prevent Markdown list breakage.
- **v1.0.28**: Implemented Smart Document Binding. The plugin actively listens for `active-leaf-change` events to remember the last document you worked on.
- **v1.0.25**: Added UI settings to configure Gateway URL, Auth Token, and Session Key directly within Obsidian.
- **v1.0.23**: Fixed WebSocket keep-alive connection drops by utilizing the official `health` RPC method.

## 🐛 Troubleshooting & Known Gotchas (Developer Notes)
If you ever plan to modify this plugin, here are a few pitfalls we ran into during development:
1. **WebSocket Handshake & JSON-RPC**: OpenClaw Gateway expects strict JSON-RPC for requests. You **must** send `{ type: "req", method: "chat.send", ... }`. Sending `{ type: "event" }` from a client will cause the Gateway to immediately reject the payload.
2. **Keep-Alive (Heartbeat)**: The Gateway does not have a generic `ping` method. To keep the WebSocket alive, you must poll the `health` method every ~30 seconds.
3. **Session Leakage**: Gateway broadcasts \`agent\` and \`chat.message\` events to all connected clients. If you don't explicitly filter by \`sessionKey\` in your `onmessage` handler, your Obsidian plugin will print replies meant for your WhatsApp or Telegram bots!
4. **Obsidian Active View Focus**: When a user clicks the input box inside your custom sidebar view, the main Markdown editor **loses focus**. \`app.workspace.getActiveViewOfType(MarkdownView)\` will return \`null\`. The solution is to listen to \`active-leaf-change\` globally and cache the last known Markdown editor to ensure "Dual-Write" always finds a target document.

## Commands & Workflows 🪄
- **`/askdoc` (v1.0.36+)**: Type `/askdoc` followed by your prompt in the chat box to send the *entire text of your currently active markdown document* as context to OpenClaw. 
  *Example*: Open a messy raw web-scrape in your editor, and type `/askdoc Please summarize this architecture and rewrite it in a professional engineering tone without AI fluff.` OpenClaw will read the file and insert the beautifully formatted result directly beneath your cursor.
