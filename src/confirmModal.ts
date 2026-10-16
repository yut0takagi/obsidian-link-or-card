import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

/** Resolves true only when the confirm button is pressed; Esc, the close button or Cancel all mean no. */
export function confirmAction(app: App, options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => new ConfirmModal(app, options, resolve).open());
}

class ConfirmModal extends Modal {
  private confirmed = false;

  constructor(
    app: App,
    private readonly options: ConfirmOptions,
    private readonly resolve: (confirmed: boolean) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    // titleEl rather than setTitle(), which needs Obsidian 1.10.
    this.titleEl.setText(this.options.title);
    this.contentEl.createEl("p", { text: this.options.message });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(this.options.cancelText).onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText(this.options.confirmText)
          .setWarning()
          .onClick(() => {
            this.confirmed = true;
            this.close();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolve(this.confirmed);
  }
}
