import { MarkdownView, Menu, Notice, Plugin, moment, requestUrl } from "obsidian";
import type { Editor, EditorPosition, MarkdownFileInfo, MarkdownPostProcessorContext } from "obsidian";
import { CARD_LANGUAGE, formatCardBlock, parseCardBlock } from "./src/cardBlock";
import type { CardData } from "./src/cardBlock";
import { renderCard } from "./src/cardView";
import { conversionsFor } from "./src/choices";
import type { Style } from "./src/choices";
import { confirmAction } from "./src/confirmModal";
import {
  blockReplacement,
  canTransformPaste,
  findCardBlockAt,
  findLinkAt,
  isInsideCodeFence,
  isInsideFrontmatter,
  isInsideTable,
  locateNearest,
} from "./src/editorText";
import { fetchMetadata } from "./src/fetchMetadata";
import type { Requester } from "./src/fetchMetadata";
import { getStrings } from "./src/i18n";
import type { Strings } from "./src/i18n";
import { formatMarkdownLink } from "./src/markdownLink";
import { cardlinkConversions } from "./src/migrate";
import { planRefresh } from "./src/refresh";
import type { RefreshMode } from "./src/refresh";
import { decidePaste, parseDomainList } from "./src/pasteRules";
import type { DomainRules } from "./src/pasteRules";
import { DEFAULT_SETTINGS, LinkOrCardSettingTab } from "./src/settings";
import type { LinkOrCardSettings } from "./src/settings";
import { truncateTitle } from "./src/title";
import { displayHost, isPrivateUrl, parseDroppedUrl, parsePastedUrl, safeHttpUrl } from "./src/url";

type Target =
  | { kind: "bare"; from: EditorPosition; to: EditorPosition; url: string }
  | { kind: "markdown"; from: EditorPosition; to: EditorPosition; url: string; text: string }
  | { kind: "card"; from: EditorPosition; to: EditorPosition; data: CardData };

type CardTarget = Extract<Target, { kind: "card" }>;

const urlOf = (target: Target): string => (target.kind === "card" ? target.data.url : target.url);

interface EditorContext {
  editor: Editor;
  info: MarkdownView | MarkdownFileInfo;
}

const ICONS: Record<Style, string> = { card: "image", link: "link", plain: "globe" };

/** Fast fetches finish before this, so the "fetching" notice only shows when there is something to wait for. */
const NOTICE_DELAY_MS = 400;

/** Obsidian exposes the CodeMirror view as `editor.cm` but does not type it. */
interface CodeMirrorLike {
  dom: HTMLElement;
  coordsAtPos(pos: number): { left: number; bottom: number } | null;
  posAtCoords(coords: { x: number; y: number }): number | null;
}

const codeMirror = (editor: Editor): CodeMirrorLike | undefined => (editor as unknown as { cm?: CodeMirrorLike }).cm;

const request: Requester = async (url) => {
  const response = await requestUrl({
    url,
    method: "GET",
    headers: { Accept: "text/html,application/xhtml+xml" },
    throw: false,
  });
  return { status: response.status, headers: response.headers, arrayBuffer: response.arrayBuffer };
};

export default class LinkOrCardPlugin extends Plugin {
  settings: LinkOrCardSettings = { ...DEFAULT_SETTINGS };
  strings: Strings = getStrings(moment.locale());

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerMarkdownCodeBlockProcessor(CARD_LANGUAGE, (source, el, ctx) => {
      renderCard(el, parseCardBlock(source), {
        onOpen: (url) => window.open(url, "_blank"),
        onMenu: (event) => this.showCardMenu(event, el, ctx),
        invalidText: this.strings.invalidCard,
      });
    });

    this.registerEvent(
      this.app.workspace.on("editor-paste", (evt, editor, info) => this.handlePaste(evt, { editor, info })),
    );
    this.registerEvent(
      this.app.workspace.on("editor-drop", (evt, editor, info) => this.handleDrop(evt, { editor, info })),
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => this.addEditorMenuItems(menu, { editor, info })),
    );

    this.addCommand({
      id: "change-link-style",
      name: this.strings.commandChangeStyle,
      editorCallback: (editor, info) => {
        const target = this.targetAt(editor, editor.getCursor());
        if (target === null) {
          new Notice(this.strings.noLinkAtCursor);
          return;
        }
        this.showMenuAtCursor({ editor, info }, target, this.conversions(editor, target), this.convertLabels());
      },
    });
    this.addCommand({
      id: "refresh-card",
      name: this.strings.commandRefreshCard,
      editorCallback: (editor, info) => this.withCardAtCursor({ editor, info }, "fill"),
    });
    this.addCommand({
      id: "refetch-card",
      name: this.strings.commandRefetchCard,
      editorCallback: (editor, info) => this.withCardAtCursor({ editor, info }, "replace"),
    });
    this.addCommand({
      id: "convert-auto-card-link",
      name: this.strings.commandMigrate,
      editorCallback: (editor) => this.convertCardlinks(editor),
    });

    this.addSettingTab(new LinkOrCardSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<LinkOrCardSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...saved };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private domainRules(): DomainRules {
    return {
      exclude: parseDomainList(this.settings.excludedDomains),
      card: parseDomainList(this.settings.cardDomains),
      link: parseDomainList(this.settings.linkDomains),
    };
  }

  private handlePaste(evt: ClipboardEvent, context: EditorContext): void {
    if (!this.settings.askOnPaste || evt.defaultPrevented) return;
    const clipboard = evt.clipboardData;
    if (clipboard === null || clipboard.files.length > 0) return;
    const url = parsePastedUrl(clipboard.getData("text/plain"));
    if (url === null || context.editor.somethingSelected()) return;
    this.receiveUrl(evt, context, url, context.editor.getCursor());
  }

  /** A link dragged in from a browser gets the same choice as a pasted one, at the drop point. */
  private handleDrop(evt: DragEvent, context: EditorContext): void {
    if (!this.settings.askOnPaste || evt.defaultPrevented) return;
    const transfer = evt.dataTransfer;
    if (transfer === null || transfer.files.length > 0) return;
    const url = parseDroppedUrl(transfer.getData("text/uri-list"));
    const offset = url === null ? null : codeMirror(context.editor)?.posAtCoords({ x: evt.clientX, y: evt.clientY });
    if (url === null || offset === null || offset === undefined) return;
    this.receiveUrl(evt, context, url, context.editor.offsetToPos(offset));
  }

  private receiveUrl(evt: ClipboardEvent | DragEvent, context: EditorContext, url: string, from: EditorPosition): void {
    const { editor } = context;
    if (!canTransformPaste(editor, from.line, from.ch)) return;
    const decision = decidePaste(url, this.domainRules(), isInsideTable(editor, from.line));
    if (decision.action === "ignore") return;

    // Insert the URL right away, so closing the menu leaves an ordinary paste behind.
    evt.preventDefault();
    editor.replaceRange(url, from);
    const to = { line: from.line, ch: from.ch + url.length };
    // A drop may come while another pane has focus; the menu and its Esc belong to this editor.
    editor.focus();
    editor.setCursor(to);
    const target: Target = { kind: "bare", from, to, url };
    if (decision.action === "apply") void this.applyStyle(context, target, decision.style);
    else this.showMenuAtCursor(context, target, decision.styles, this.pasteLabels());
  }

  private conversions(editor: Editor, target: Target): Style[] {
    return conversionsFor(target.kind, target.kind !== "card" && isInsideTable(editor, target.from.line));
  }

  private addEditorMenuItems(menu: Menu, context: EditorContext): void {
    const target = this.targetAt(context.editor, context.editor.getCursor());
    if (target === null) return;
    this.addPrivateLabel(menu, urlOf(target));
    this.addStyleItems(menu, context, target, this.conversions(context.editor, target), this.convertLabels());
    if (target.kind === "card") this.addRefreshItems(menu, context, target);
  }

  /** Right-clicking a rendered card, where the editor cursor cannot reach in Live Preview or Reading view. */
  private showCardMenu(event: MouseEvent, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const section = ctx.getSectionInfo(el);
    if (view === null || view.file?.path !== ctx.sourcePath || section === null) return;
    const target = this.targetAt(view.editor, { line: section.lineStart, ch: 0 });
    if (target?.kind !== "card") return;

    event.preventDefault();
    event.stopPropagation();
    const context = { editor: view.editor, info: view };
    const menu = new Menu();
    this.addPrivateLabel(menu, target.data.url);
    this.addStyleItems(menu, context, target, conversionsFor("card", false), this.convertLabels());
    this.addRefreshItems(menu, context, target);
    menu.showAtMouseEvent(event);
  }

  private showMenuAtCursor(context: EditorContext, target: Target, styles: Style[], labels: Record<Style, string>): void {
    const menu = new Menu();
    this.addPrivateLabel(menu, urlOf(target));
    this.addStyleItems(menu, context, target, styles, labels);
    const cm = codeMirror(context.editor);
    const coords = cm?.coordsAtPos(context.editor.posToOffset(target.to));
    if (cm !== undefined && coords) menu.showAtPosition({ x: coords.left, y: coords.bottom }, cm.dom.ownerDocument);
    else menu.showAtPosition({ x: activeWindow.innerWidth / 2, y: activeWindow.innerHeight / 3 });
  }

  private addStyleItems(
    menu: Menu,
    context: EditorContext,
    target: Target,
    styles: Style[],
    labels: Record<Style, string>,
  ): void {
    for (const style of styles) {
      menu.addItem((item) =>
        item
          .setTitle(labels[style])
          .setIcon(ICONS[style])
          .onClick(() => void this.applyStyle(context, target, style)),
      );
    }
  }

  /**
   * Fetching a local address is allowed when the user picks it, but the menu
   * says so, since a page there may not be meant to end up in a note.
   */
  private addPrivateLabel(menu: Menu, url: string): void {
    if (!isPrivateUrl(url)) return;
    const title = this.strings.menuPrivateAddress.replace("{host}", displayHost(url));
    menu.addItem((item) => item.setTitle(title).setIcon("shield-alert").setIsLabel(true));
  }

  private addRefreshItems(menu: Menu, context: EditorContext, target: CardTarget): void {
    menu.addItem((item) =>
      item
        .setTitle(this.strings.menuRefreshCard)
        .setIcon("refresh-cw")
        .onClick(() => void this.refreshCard(context, target, "fill")),
    );
    menu.addItem((item) =>
      item
        .setTitle(this.strings.menuRefetchCard)
        .setIcon("rotate-ccw")
        .onClick(() => void this.refreshCard(context, target, "replace")),
    );
  }

  private withCardAtCursor(context: EditorContext, mode: RefreshMode): void {
    const target = this.targetAt(context.editor, context.editor.getCursor());
    if (target?.kind !== "card") {
      new Notice(this.strings.noCardAtCursor);
      return;
    }
    void this.refreshCard(context, target, mode);
  }

  private pasteLabels(): Record<Style, string> {
    return { card: this.strings.menuCard, link: this.strings.menuLink, plain: this.strings.menuPlain };
  }

  private convertLabels(): Record<Style, string> {
    return { card: this.strings.toCard, link: this.strings.toLink, plain: this.strings.toPlain };
  }

  private targetAt(editor: Editor, pos: EditorPosition): Target | null {
    const block = findCardBlockAt(editor, pos.line);
    if (block !== null) {
      const data = parseCardBlock(block.source);
      if (data === null || safeHttpUrl(data.url) === null) return null;
      const from = { line: block.startLine, ch: editor.getLine(block.startLine).indexOf("```") };
      const to = { line: block.endLine, ch: editor.getLine(block.endLine).length };
      return { kind: "card", from, to, data };
    }
    if (isInsideCodeFence(editor, pos.line) || isInsideFrontmatter(editor, pos.line)) return null;

    const link = findLinkAt(editor.getLine(pos.line), pos.ch);
    if (link === null) return null;
    const from = { line: pos.line, ch: link.from };
    const to = { line: pos.line, ch: link.to };
    return link.kind === "bare"
      ? { kind: "bare", from, to, url: link.url }
      : { kind: "markdown", from, to, url: link.url, text: link.text };
  }

  private async applyStyle(context: EditorContext, target: Target, style: Style): Promise<void> {
    const { editor } = context;

    if (target.kind === "card") {
      const { url, title } = target.data;
      const text = style === "link" && title !== undefined ? formatMarkdownLink(this.limitTitle(title), url) : url;
      editor.replaceRange(text, target.from, target.to);
      return;
    }
    if (style === "plain") {
      if (target.kind === "markdown") editor.replaceRange(target.url, target.from, target.to);
      return;
    }

    // Card and link both need the page. The note may change while it loads.
    const original = editor.getRange(target.from, target.to);
    const path = context.info.file?.path;
    const meta = this.withTitleLimit(await this.fetchWithNotice(target.url));
    const range = context.info.file?.path === path ? this.relocate(editor, original, target.from) : null;
    if (range === null) {
      new Notice(this.strings.urlMoved);
      return;
    }

    if (style === "link") {
      const title = meta?.title;
      if (title === undefined) {
        new Notice(this.strings.noTitle);
        return;
      }
      editor.replaceRange(formatMarkdownLink(title, target.url), range.from, range.to);
      return;
    }

    // The menu never offers a card in a table, but the URL may have been moved into one while the page loaded.
    if (isInsideTable(editor, range.from.line)) {
      new Notice(this.strings.cardInTable);
      return;
    }
    if (meta === null) new Notice(this.strings.cardWithoutMeta);
    const data: CardData = { ...(meta ?? { url: target.url }) };
    if (data.title === undefined && target.kind === "markdown" && target.text.trim() !== "") data.title = target.text;
    const line = editor.getLine(range.from.line);
    editor.replaceRange(blockReplacement(line, range.from.ch, range.to.ch, formatCardBlock(data)), range.from, range.to);
  }

  /**
   * Re-reads the page for a card. planRefresh decides whether a request may be
   * sent at all: never without confirming the host, never to a local address.
   */
  private async refreshCard(context: EditorContext, target: CardTarget, mode: RefreshMode): Promise<void> {
    const { editor } = context;
    const original = editor.getRange(target.from, target.to);
    const path = context.info.file?.path;
    const t = this.strings;
    const outcome = await planRefresh(target.data, mode, {
      confirm: ({ host }) =>
        confirmAction(this.app, {
          title: mode === "fill" ? t.confirmRefreshTitle : t.confirmRefetchTitle,
          message: (mode === "fill" ? t.confirmRefreshBody : t.confirmRefetchBody).replace("{host}", host),
          confirmText: mode === "fill" ? t.confirmRefreshButton : t.confirmRefetchButton,
          cancelText: t.cancel,
        }),
      fetch: async (url) => this.withTitleLimit(await this.fetchWithNotice(url)),
    });

    switch (outcome.kind) {
      case "nothing-empty":
        new Notice(t.refreshNothingEmpty);
        return;
      case "private":
        new Notice(t.refreshPrivate.replace("{host}", outcome.host));
        return;
      case "cancelled":
        return;
      case "failed":
        new Notice(t.refreshFailed);
        return;
      case "unchanged":
        new Notice(t.refreshNoChange);
        return;
      case "updated":
        break;
    }

    const range = context.info.file?.path === path ? this.relocate(editor, original, target.from) : null;
    if (range === null) {
      new Notice(t.cardMoved);
      return;
    }
    const line = editor.getLine(range.from.line);
    editor.replaceRange(blockReplacement(line, range.from.ch, line.length, formatCardBlock(outcome.data)), range.from, range.to);
  }

  /** One undoable edit for the whole note; blocks that could not be read are reported and left alone. */
  private convertCardlinks(editor: Editor): void {
    const { changes, skipped } = cardlinkConversions(editor);
    if (changes.length === 0 && skipped === 0) {
      new Notice(this.strings.migrateNone);
      return;
    }
    if (changes.length > 0) editor.transaction({ changes });
    const messages: string[] = [];
    if (changes.length > 0) messages.push(this.strings.migrateDone.replace("{count}", String(changes.length)));
    if (skipped > 0) messages.push(this.strings.migrateSkipped.replace("{count}", String(skipped)));
    new Notice(messages.join(" "));
  }

  private limitTitle(title: string): string {
    return truncateTitle(title, this.settings.maxTitleLength);
  }

  private withTitleLimit(meta: CardData | null): CardData | null {
    if (meta?.title === undefined) return meta;
    return { ...meta, title: this.limitTitle(meta.title) };
  }

  private relocate(editor: Editor, original: string, from: EditorPosition): { from: EditorPosition; to: EditorPosition } | null {
    const text = editor.getValue();
    const expected = from.line <= editor.lastLine() ? editor.posToOffset(from) : text.length;
    const offset = locateNearest(text, original, expected);
    if (offset === -1) return null;
    return { from: editor.offsetToPos(offset), to: editor.offsetToPos(offset + original.length) };
  }

  private async fetchWithNotice(url: string): Promise<CardData | null> {
    const state: { notice?: Notice } = {};
    const timer = window.setTimeout(() => {
      state.notice = new Notice(this.strings.fetching, 0);
    }, NOTICE_DELAY_MS);
    try {
      return await fetchMetadata(url, request);
    } finally {
      window.clearTimeout(timer);
      state.notice?.hide();
    }
  }
}
