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

        const messagesContainer = chatBox.createEl("div", { cls: "claw-messages" });
        messagesContainer.style.flexGrow = "2";
        messagesContainer.style.overflowY = "auto";
        messagesContainer.style.border = "1px solid var(--background-modifier-border)";
        messagesContainer.style.padding = "10px";
        messagesContainer.style.borderRadius = "4px";

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
                    type: "req",
                    id: Date.now().toString(),
                    method: "chat.send",
                    params: {
                        message: text,
                        sessionKey: this.plugin.settings.sessionKey || "agent:main:obsidian",
                        idempotencyKey: Date.now().toString()
                    }
                };
                console.log('%c[发送到 Gateway]', 'background: #222; color: #f39c12; font-size: 16px; font-weight: bold;', payload);
                this.plugin.ws.send(JSON.stringify(payload));
                new Notice("Message sent!");
                // SIDEBAR: Append user message
                const container = this.contentEl.querySelector(".claw-messages");
                if (container) {
                    const msgEl = document.createElement("div");
                    msgEl.style.marginBottom = "8px";
                    msgEl.style.padding = "8px";
                    msgEl.style.background = "var(--interactive-accent)";
                    msgEl.style.color = "var(--text-on-accent)";
                    msgEl.style.borderRadius = "4px";
                    msgEl.innerText = "You: " + text;
                    container.appendChild(msgEl);
                    container.scrollTop = container.scrollHeight;
                }

                // DOCUMENT: Append user message
                let editor = this.plugin.lastActiveEditor;
                if (!editor) {
                    const mdLeaves = this.plugin.app.workspace.getLeavesOfType("markdown");
                    if (mdLeaves.length > 0) editor = (mdLeaves[0]?.view as MarkdownView)?.editor;
                }
                if (editor) {
                    const cursor = editor.getCursor();
                    const now = new Date(); const pad = (n: number) => n.toString().padStart(2, '0'); const timestamp = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate()) + ' ' + pad(now.getUTCHours()) + ':' + pad(now.getUTCMinutes()) + ' UTC'; const docText = "\n> **[主人]**: " + text + " (" + timestamp + ")\n> \n";
                    editor.replaceRange(docText, cursor);
                    const newOffset = editor.posToOffset(cursor) + docText.length;
                    editor.setCursor(editor.offsetToPos(newOffset));
                }

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
	_docStreaming: boolean = false;
	lastActiveEditor: Editor | null = null;
	settings: MyPluginSettings;
	ws: WebSocket | null = null;
	pingInterval: number | null = null;
	reconnectTimeout: number | null = null;
	isEstablished: boolean = false;

	async onload() {
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf?.view instanceof MarkdownView) {
					this.lastActiveEditor = leaf.view.editor;
				}
			})
		);
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
							id: "openclaw-control-ui",
							version: "1.0",
							platform: "browser",
							mode: "webchat"
						},
						scopes: ["operator.write"],
						auth: {
							token: this.settings.authToken
						}
					}
				}));

				// Start heartbeat
				this.pingInterval = window.setInterval(() => {
					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send(JSON.stringify({ 
							type: "req", 
							id: "ping-" + Date.now(), 
							method: "health" 
						}));
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

				try {
					const parsed = JSON.parse(event.data);
					const payload = parsed.payload || parsed.result || {};

					// 1. Handshake
					if (parsed.type === "res" && parsed.id === "1") {
						if (parsed.ok && payload.protocol) {
							console.log("OpenClaw: Handshake Accepted!", payload);
							this.isEstablished = true;
							new Notice("OpenClaw connected!");
						} else {
							console.error("OpenClaw: Handshake Failed", parsed.error);
							new Notice("Handshake failed: " + (parsed.error?.message || "unknown error"));
						}
						return;
					}

					// 2. Ignore noise
					if (parsed.type === "event" && ["connect.challenge", "tick", "health", "presence", "ping"].includes(parsed.event)) return;
					if (parsed.type === "res" && typeof parsed.id === "string" && parsed.id.startsWith("ping-")) return;

					// Check if stream ended to reset doc streaming state
                    if (parsed.type === "event" && parsed.event === "agent" && payload.stream === "assistant" && payload.state === "done") {
                        this._docStreaming = false;
                        // Add trailing newline to document after AI is done
                        let editor = this.lastActiveEditor;
						if (!editor) {
							const mdLeaves = this.app.workspace.getLeavesOfType("markdown");
							if (mdLeaves.length > 0) editor = (mdLeaves[0]?.view as MarkdownView)?.editor;
						}
                        if (editor) {
                            const cursor = editor.getCursor();
                            editor.replaceRange("\n> \n\n", cursor);
                            const newOffset = editor.posToOffset(cursor) + 4;
                            editor.setCursor(editor.offsetToPos(newOffset));
                        }
                    }
                    if (parsed.type === "res") {
                        this._docStreaming = false; // direct response implies one-shot end
                    }

					// 3. Extract Message
					let message = "";
					
                    // **CRITICAL FIX**: Only process messages intended for this specific session!
                    const expectedKey = this.settings.sessionKey || "agent:main:obsidian";
					if (parsed.type === "event" && parsed.payload?.sessionKey && parsed.payload.sessionKey !== expectedKey) {
                        return; // Ignore events from other sessions (like WhatsApp)
                    }

					if (parsed.type === "event") {
						if (parsed.event === "chat.message") message = payload.message || "";
						if (parsed.event === "agent" && payload.stream === "assistant" && payload.data?.delta) message = payload.data.delta;
						if (parsed.event === "chat.delta") message = payload.delta || "";
					} else if (parsed.type === "res") {
						if (payload.message) message = payload.message;
						else if (Array.isArray(payload.content)) {
							message = payload.content.map((c: any) => c.text || "").join("");
						}
					}

					// 4. Write to Editor
					if (message) {
						// 1. UPDATE SIDEBAR
						const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLAW);
						if (leaves.length > 0) {
							const view = leaves[0]?.view as any;
							const container = view.contentEl.querySelector(".claw-messages");
							if (container) {
								let lastMsg = container.lastElementChild;
								if (!lastMsg || !lastMsg.classList.contains("claw-ai-message")) {
									lastMsg = document.createElement("div");
									lastMsg.classList.add("claw-ai-message");
									lastMsg.style.marginBottom = "8px";
									lastMsg.style.padding = "8px";
									lastMsg.style.background = "var(--background-secondary)";
									lastMsg.style.borderRadius = "4px";
									lastMsg.style.whiteSpace = "pre-wrap"; 
									lastMsg.innerText = "🐱: " + message;
									container.appendChild(lastMsg);
								} else {
									lastMsg.innerText += message;
								}
								container.scrollTop = container.scrollHeight;
							}
						}

						// 2. UPDATE DOCUMENT
						let editor = this.lastActiveEditor;
						if (!editor) {
							const mdLeaves = this.app.workspace.getLeavesOfType("markdown");
							if (mdLeaves.length > 0) editor = (mdLeaves[0]?.view as MarkdownView)?.editor;
						}
						if (editor) {
							const cursor = editor.getCursor();
							if (!this._docStreaming) {
								this._docStreaming = true;
								const prefix = "> **[Cat Butler]**: " + message.replace(/\n/g, "\n> ");
								editor.replaceRange(prefix, cursor);
								const newOffset = editor.posToOffset(cursor) + prefix.length;
								editor.setCursor(editor.offsetToPos(newOffset));
							} else {
                                const formattedMessage = message.replace(/\n/g, "\n> ");
								editor.replaceRange(formattedMessage, cursor);
								const newOffset = editor.posToOffset(cursor) + formattedMessage.length;
								editor.setCursor(editor.offsetToPos(newOffset));
							}
						}
					}
				} catch (e) {
					console.error("OpenClaw: Message processing error", e);
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
