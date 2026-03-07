import {App, Editor, MarkdownView, Modal, Notice, Plugin, ItemView, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

export const VIEW_TYPE_CLAW = "claw-view";

export class ClawView extends ItemView {
    plugin: MyPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_CLAW;
    }

    getDisplayText() {
        return "Claw Chat";
    }

    getIcon() {
        return "message-circle";
    }

    async onOpen() {
        const container = this.contentEl;
        
        container.empty();

        container.createEl("h4", { text: "Claw Chat" });

        const chatBox = container.createEl("div", { cls: "claw-chat-box" });
        chatBox.style.display = "flex";
        chatBox.style.flexDirection = "column";
        chatBox.style.gap = "10px";
        chatBox.style.height = "100%";

        const textarea = chatBox.createEl("textarea", {
            placeholder: "Type a message..."
        });
        textarea.style.flexGrow = "1";
        textarea.style.resize = "none";
        textarea.style.minHeight = "100px";

        const button = chatBox.createEl("button", { text: "Send" });
        button.style.cursor = "pointer";

        button.addEventListener("click", () => {
            const text = textarea.value.trim();
            if (!text) {
                new Notice("Message is empty!");
                return;
            }

            if (this.plugin.ws && this.plugin.ws.readyState === WebSocket.OPEN) {
                if (!this.plugin.isEstablished) {
                    new Notice("WebSocket is connecting (handshake pending), please wait.");
                    return;
                }
                const payload = {
                    jsonrpc: "2.0",
                    method: "messages/create",
                    params: {
                        content: text
                    },
                    id: Date.now()
                };
                console.log('%c[发送到 Gateway]', 'background: #222; color: #f39c12; font-size: 16px; font-weight: bold;', payload);
                this.plugin.ws.send(JSON.stringify(payload));
                new Notice("Message sent!");
                textarea.value = "";
            } else {
                new Notice("WebSocket is not connected.");
            }
        });
    }

    async onClose() {
        // Cleanup if needed
    }
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	ws: WebSocket | null = null;
	pingInterval: number | null = null;
	reconnectTimeout: number | null = null;
	isEstablished: boolean = false;

	async onload() {
		await this.loadSettings();

		this.connectWebSocket();

		this.registerView(
			VIEW_TYPE_CLAW,
			(leaf) => new ClawView(leaf, this)
		);

		this.addRibbonIcon('message-circle', 'Open Claw Chat', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-claw-chat',
			name: 'Open Claw Chat View',
			callback: () => {
				this.activateView();
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	connectWebSocket() {
		// Clean up existing timers
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		try {
			let wsUrl = this.settings.gatewayUrl;
			if (this.settings.authToken) {
				wsUrl += "?token=" + this.settings.authToken;
			}
			this.ws = new WebSocket(wsUrl);
			this.ws.onopen = () => {
				this.isEstablished = false;
				console.log(`OpenClaw Claw: Successfully connected to ${this.settings.gatewayUrl}`);
				
				// Send proper OpenClaw Connect Request
				this.ws?.send(JSON.stringify({
					type: "req",
					id: "1",
					method: "connect",
					params: {
						minProtocol: 3,
						maxProtocol: 3,
						client: {
							id: "webchat-ui",
							version: "1.0",
							platform: "browser",
							mode: "ui"
						},
						auth: {
							token: this.settings.authToken
						}
					}
				}));

				// Start heartbeat
				this.pingInterval = window.setInterval(() => {
					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send(JSON.stringify({ type: "ping" }));
					}
				}, 30000);
			};
			this.ws.onerror = (error) => {
				console.error('OpenClaw Claw: WebSocket error', error);
			};
			this.ws.onclose = () => {
				this.isEstablished = false;
				console.log('OpenClaw Claw: WebSocket connection closed');
				if (this.pingInterval) {
					clearInterval(this.pingInterval);
					this.pingInterval = null;
				}
				// Reconnect logic
				console.log('OpenClaw Claw: Reconnecting in 3 seconds...');
				this.reconnectTimeout = window.setTimeout(() => {
					this.connectWebSocket();
				}, 3000);
			};
			this.ws.onmessage = (event) => {
				console.log('%c[Gateway 原始消息]', 'background: #222; color: #bada55; font-size: 16px; font-weight: bold;', event.data);

				// Check if it is the connect response
				try {
					const parsed = JSON.parse(event.data);
					if (parsed.type === "response" && parsed.id === "1" && parsed.result?.protocol) {
						console.log("Gateway Handshake Accepted!", parsed.result);
						this.isEstablished = true;
						new Notice("OpenClaw connected successfully!");
						return;
					}
				} catch (e) {}

				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					const editor = activeView.editor;
					const cursor = editor.getCursor();
					const message = String(event.data);
					editor.replaceRange(message, cursor);
					const newOffset = editor.posToOffset(cursor) + message.length;
					editor.setCursor(editor.offsetToPos(newOffset));
				}
			};
		} catch (e) {
			console.error('OpenClaw Claw: Failed to connect WebSocket', e);
			this.reconnectTimeout = window.setTimeout(() => {
				this.connectWebSocket();
			}, 3000);
		}
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null | undefined = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CLAW);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
            if(leaf) {
			    await leaf.setViewState({ type: VIEW_TYPE_CLAW, active: true });
            }
		}

        if(leaf) {
		    workspace.revealLeaf(leaf);
        }
	}

	onunload() {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
		}
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}
		if (this.ws) {
			this.ws.onclose = null; // Prevent reconnect loop
			this.ws.close();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
