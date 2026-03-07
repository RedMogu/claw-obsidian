import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	sessionKey: string;
	mySetting: string;
	gatewayUrl: string;
	authToken: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	gatewayUrl: 'ws://100.93.80.61:18789',
	authToken: '',
	sessionKey: 'agent:main:obsidian'
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Session Key')
			.setDesc('Identifier for isolating this conversation from other clients (e.g. WhatsApp)')
			.addText(text => text
				.setPlaceholder('agent:main:obsidian')
				.setValue(this.plugin.settings.sessionKey)
				.onChange(async (value) => {
					this.plugin.settings.sessionKey = value || 'agent:main:obsidian';
					await this.plugin.saveSettings();
				}));

		

		new Setting(containerEl)
			.setName('Gateway URL')
			.setDesc('WebSocket URL for OpenClaw Gateway')
			.addText(text => text
				.setPlaceholder('ws://100.93.80.61:18789')
				.setValue(this.plugin.settings.gatewayUrl)
				.onChange(async (value) => {
					this.plugin.settings.gatewayUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Gateway Auth Token')
			.setDesc('Token for authenticating with OpenClaw Gateway')
			.addText(text => text
				.setPlaceholder('Enter auth token')
				.setValue(this.plugin.settings.authToken)
				.onChange(async (value) => {
					this.plugin.settings.authToken = value;
					await this.plugin.saveSettings();
				}));
	}
}
