import { PluginSettingTab, Setting } from "obsidian";
import type { App, SettingDefinitionItem } from "obsidian";
import type LinkOrCardPlugin from "../main";

export interface LinkOrCardSettings {
  askOnPaste: boolean;
  /** One host per line; read with parseDomainList. Kept as text so the settings textarea edits it directly. */
  excludedDomains: string;
  cardDomains: string;
  linkDomains: string;
  /** 0 means no limit. */
  maxTitleLength: number;
}

export const DEFAULT_SETTINGS: LinkOrCardSettings = {
  askOnPaste: true,
  excludedDomains: "",
  cardDomains: "",
  linkDomains: "",
  maxTitleLength: 0,
};

type DomainKey = "excludedDomains" | "cardDomains" | "linkDomains";

const DOMAIN_PLACEHOLDER = "example.com";

const isTitleLimit = (value: number): boolean => Number.isInteger(value) && value >= 0;

export class LinkOrCardSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: LinkOrCardPlugin,
  ) {
    super(app, plugin);
  }

  private domainSettings(): { key: DomainKey; name: string; desc: string }[] {
    const t = this.plugin.strings;
    return [
      { key: "excludedDomains", name: t.settingExcludeName, desc: t.settingExcludeDesc },
      { key: "cardDomains", name: t.settingCardDomainsName, desc: t.settingCardDomainsDesc },
      { key: "linkDomains", name: t.settingLinkDomainsName, desc: t.settingLinkDomainsDesc },
    ];
  }

  /**
   * Obsidian 1.13+ renders the tab from these definitions and indexes them for
   * settings search; the inherited get/setControlValue read and save
   * `plugin.settings`. Older versions ignore this and call display() below.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const t = this.plugin.strings;
    return [
      {
        name: t.settingAskOnPasteName,
        desc: t.settingAskOnPasteDesc,
        control: { type: "toggle", key: "askOnPaste", defaultValue: DEFAULT_SETTINGS.askOnPaste },
      },
      ...this.domainSettings().map(({ key, name, desc }) => ({
        name,
        desc,
        control: { type: "textarea" as const, key, defaultValue: "", placeholder: DOMAIN_PLACEHOLDER, rows: 3 },
      })),
      {
        name: t.settingTitleLimitName,
        desc: t.settingTitleLimitDesc,
        control: {
          type: "number",
          key: "maxTitleLength",
          defaultValue: DEFAULT_SETTINGS.maxTitleLength,
          min: 0,
          step: 1,
          validate: (value) => (isTitleLimit(value) ? undefined : t.settingTitleLimitInvalid),
        },
      },
    ];
  }

  /** Fallback for Obsidian versions before 1.13, which do not read getSettingDefinitions(). */
  display(): void {
    const { containerEl } = this;
    const t = this.plugin.strings;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t.settingAskOnPasteName)
      .setDesc(t.settingAskOnPasteDesc)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.askOnPaste).onChange(async (value) => {
          this.plugin.settings.askOnPaste = value;
          await this.plugin.saveSettings();
        }),
      );

    for (const { key, name, desc } of this.domainSettings()) {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addTextArea((text) =>
          text
            .setPlaceholder(DOMAIN_PLACEHOLDER)
            .setValue(this.plugin.settings[key])
            .onChange(async (value) => {
              this.plugin.settings[key] = value;
              await this.plugin.saveSettings();
            }),
        );
    }

    new Setting(containerEl)
      .setName(t.settingTitleLimitName)
      .setDesc(t.settingTitleLimitDesc)
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text
          .setPlaceholder("0")
          .setValue(String(this.plugin.settings.maxTitleLength))
          .onChange(async (value) => {
            const limit = value.trim() === "" ? 0 : Number(value);
            if (!isTitleLimit(limit)) return;
            this.plugin.settings.maxTitleLength = limit;
            await this.plugin.saveSettings();
          });
      });
  }
}
