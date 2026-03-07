import {App, PluginSettingTab, Setting} from "obsidian";
import MyPlugin from "./main";

export interface MyPluginSettings {
	mySetting: string;
	gatewayUrl: string;
	authToken: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	gatewayUrl: 'ws://100.93.80.61:18789',
	authToken: ''
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
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
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
