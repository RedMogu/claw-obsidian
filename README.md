# OpenClaw Molt - Obsidian Native Plugin

This is an Obsidian plugin designed to act as a native client for your [OpenClaw](https://openclaw.ai) Sovereign AI system. 

It completely bypasses traditional file-syncing methods (like iCloud or Google Drive) and establishes a direct **WebSocket** connection to your remote OpenClaw Gateway. This allows your personal AI Butler to live directly inside your Obsidian sidebar, enabling real-time, zero-latency collaboration.

## 🚀 Features

- **Native Sidebar Chat**: Adds a `Molt Chat` view to your Obsidian right sidebar.
- **Direct WebSocket Link**: Connects directly to your OpenClaw Gateway.
- **Zero-Sync Latency**: You talk to your AI, and it replies instantly, without waiting for cloud files to sync.

## 🛠️ Installation & Setup (Tailscale Environment)

Since your OpenClaw Gateway is likely running on a remote server (e.g., an Azure VM) and your Obsidian is local (e.g., your Mac), this plugin defaults to connecting via a Tailscale IP.

### 1. Prerequisites
- You must have [Tailscale](https://tailscale.com/) installed and connected on the machine running Obsidian.
- Your OpenClaw Gateway must be running and bound to its LAN/Tailscale IP (`gateway.bind: "lan"` in `openclaw.json`).

### 2. Download and Build
Open your terminal and run:
```bash
git clone https://github.com/RedMogu/claw-obsidian.git
cd claw-obsidian
npm install
npm run build
```

### 3. Install to Obsidian
1. Copy the built `claw-obsidian` folder into your Obsidian vault's plugin directory:
   `YourVaultName/.obsidian/plugins/`
2. If the folder `.obsidian` is hidden on your Mac, press `Cmd + Shift + .` in Finder to reveal it.

### 4. Enable and Use
1. Open Obsidian and go to **Settings > Community plugins**.
2. If Safe Mode is ON, turn it OFF to allow local plugins.
3. Scroll down to **Installed plugins** and toggle the switch for **OpenClaw Molt** to ON.
4. Look at the left ribbon (the vertical toolbar). Click the **Open Molt Chat** icon (message bubble).
5. A new chat panel will open in your right sidebar. 

## 🔧 Configuration (Changing the IP)
By default, the plugin connects to `ws://100.93.80.61:18789`.
If your OpenClaw Gateway's Tailscale IP changes, you need to update it:
1. Open `src/main.ts`.
2. Find the line: `this.ws = new WebSocket('ws://100.93.80.61:18789');`
3. Change the IP to your Gateway's IP.
4. Re-run `npm run build` and restart the plugin in Obsidian.

*(In future updates, this will be movable to the Obsidian Settings UI).*
