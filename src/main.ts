import {App, Editor, MarkdownView, Modal, Notice, Plugin, ItemView, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";

export const VIEW_TYPE_MOLT = "molt-view";

export class MoltView extends ItemView {
    plugin: MyPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_MOLT;
    }

    getDisplayText() {
        return "Molt Chat";
    }

    getIcon() {
        return "message-circle";
    }

    async onOpen() {
        const container = this.contentEl;
        
        container.empty();

        container.createEl("h4", { text: "Molt Chat" });

        const chatBox = container.createEl("div", { cls: "molt-chat-box" });
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
                this.plugin.ws.send(JSON.stringify({
                    type: "chat",
                    content: text
                }));
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

	async onload() {
		await this.loadSettings();

		// OpenClaw Molt WebSocket Connection
		try {
			this.ws = new WebSocket('ws://127.0.0.1:18789');
			this.ws.onopen = () => {
				console.log('OpenClaw Molt: Successfully connected to ws://127.0.0.1:18789');
			};
			this.ws.onerror = (error) => {
				console.error('OpenClaw Molt: WebSocket error', error);
			};
			this.ws.onclose = () => {
				console.log('OpenClaw Molt: WebSocket connection closed');
			};
		} catch (e) {
			console.error('OpenClaw Molt: Failed to connect WebSocket', e);
		}

		this.registerView(
			VIEW_TYPE_MOLT,
			(leaf) => new MoltView(leaf, this)
		);

		this.addRibbonIcon('message-circle', 'Open Molt Chat', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-molt-chat',
			name: 'Open Molt Chat View',
			callback: () => {
				this.activateView();
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	async activateView() {
		const { workspace } = this.app;
		
		let leaf: WorkspaceLeaf | null | undefined = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_MOLT);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
            if(leaf) {
			    await leaf.setViewState({ type: VIEW_TYPE_MOLT, active: true });
            }
		}

        if(leaf) {
		    workspace.revealLeaf(leaf);
        }
	}

	onunload() {
		if (this.ws) {
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
