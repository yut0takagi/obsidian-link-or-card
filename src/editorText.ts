import { CARD_LANGUAGE } from "./cardBlock";

/** Obsidian's Editor satisfies this, so the functions below run on it directly. */
export interface LineSource {
  getLine(line: number): string;
  lineCount(): number;
}

/** Blockquote markers, then an optional list marker (with task checkbox). */
const CONTAINER = /^(\s*(?:>\s?)*)(\s*(?:[-*+]|\d+[.)])\s+(?:\[.\]\s+)?)?/;
const FENCE = /^(`{3,}|~{3,})(.*)$/;
const CARD_OPENER = new RegExp("^`{3,}\\s*" + CARD_LANGUAGE + "\\s*$");
const CLOSER = /^`{3,}\s*$/;

const stripContainer = (text: string): string => text.slice(CONTAINER.exec(text)?.[0].length ?? 0).trimStart();

export function isInsideCodeFence(doc: LineSource, line: number): boolean {
  let open: { char: string; length: number } | null = null;
  for (let i = 0; i < line; i++) {
    const match = FENCE.exec(stripContainer(doc.getLine(i)));
    if (match === null) continue;
    const run = match[1] ?? "";
    if (open === null) open = { char: run.charAt(0), length: run.length };
    else if (run.charAt(0) === open.char && run.length >= open.length && (match[2] ?? "").trim() === "") open = null;
  }
  return open !== null;
}

export function isInsideFrontmatter(doc: LineSource, line: number): boolean {
  if (doc.getLine(0).trimEnd() !== "---") return false;
  const count = doc.lineCount();
  for (let i = 1; i < count; i++) {
    if (/^(---|\.\.\.)\s*$/.test(doc.getLine(i))) return line <= i;
  }
  return false;
}

const TABLE_DELIMITER = /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?$/;

/** `| --- | :-: |`. The pipe is required, since a bare `---` is a heading underline or a rule. */
const isDelimiterRow = (row: string): boolean => row.includes("|") && TABLE_DELIMITER.test(row);

/**
 * Whether the line is a row of a Markdown table: the header above a delimiter
 * row, the delimiter itself, or one of the piped rows that follow it.
 */
export function isInsideTable(doc: LineSource, line: number): boolean {
  const row = (i: number) => stripContainer(doc.getLine(i)).trim();
  if (!row(line).includes("|")) return false;
  if (line + 1 < doc.lineCount() && isDelimiterRow(row(line + 1))) return true;
  for (let i = line; i >= 1; i--) {
    const text = row(i);
    if (!text.includes("|")) return false;
    if (isDelimiterRow(text)) return row(i - 1).includes("|");
  }
  return false;
}

/** Whether a URL pasted at (line, ch) is prose we may restyle, rather than part of other syntax. */
export function canTransformPaste(doc: LineSource, line: number, ch: number): boolean {
  const text = doc.getLine(line);
  const before = text.slice(0, ch);
  if (isInsideFrontmatter(doc, line) || isInsideCodeFence(doc, line)) return false;
  if (FENCE.test(stripContainer(text))) return false;
  if ((before.match(/`/g) ?? []).length % 2 === 1) return false;
  if (/(\]\(\s*|<|=["'])$/.test(before)) return false;
  return true;
}

export type LinkAt =
  | { kind: "bare"; from: number; to: number; url: string }
  | { kind: "markdown"; from: number; to: number; url: string; text: string };

const MARKDOWN_LINK = /\[((?:\\.|[^\\\]])*)\]\(\s*<?(https?:\/\/(?:[^\s()<>]|\([^\s()<>]*\))+)>?\s*\)/g;
const BARE_URL = /https?:\/\/[^\s<>"'`[\]]+/g;

const count = (text: string, char: string) => text.split(char).length - 1;

/** Sentence punctuation after a URL, or a closing paren that belongs to the prose, is not part of it. */
function trimUrlEnd(url: string): string {
  let end = url.length;
  while (end > 0) {
    const last = url.charAt(end - 1);
    const head = url.slice(0, end);
    if (".,;:!?".includes(last) || (last === ")" && count(head, "(") < count(head, ")"))) end--;
    else break;
  }
  return url.slice(0, end);
}

export function findLinkAt(line: string, ch: number): LinkAt | null {
  const taken: [number, number][] = [];
  for (const match of line.matchAll(MARKDOWN_LINK)) {
    const from = match.index ?? 0;
    const to = from + match[0].length;
    const isImage = from > 0 && line.charAt(from - 1) === "!";
    taken.push([isImage ? from - 1 : from, to]);
    if (!isImage && ch >= from && ch <= to) {
      return { kind: "markdown", from, to, url: match[2] ?? "", text: (match[1] ?? "").replace(/\\(.)/g, "$1") };
    }
  }
  for (const match of line.matchAll(BARE_URL)) {
    const from = match.index ?? 0;
    const url = trimUrlEnd(match[0]);
    const to = from + url.length;
    if (taken.some(([start, end]) => from >= start && from < end)) continue;
    if (ch >= from && ch <= to) return { kind: "bare", from, to, url };
  }
  return null;
}

export interface CardBlockAt {
  startLine: number;
  endLine: number;
  /** Block body with blockquote and list indentation removed, ready for parseCardBlock. */
  source: string;
}

export function findCardBlockAt(doc: LineSource, line: number): CardBlockAt | null {
  const at = (i: number) => stripContainer(doc.getLine(i));
  let start = line;
  // On a closing fence, the opener is above; do not read the closer as an opener.
  if (CLOSER.test(at(start))) start--;
  while (start >= 0 && !FENCE.test(at(start))) start--;
  if (start < 0 || !CARD_OPENER.test(at(start))) return null;

  const lines = doc.lineCount();
  let end = start + 1;
  while (end < lines && !CLOSER.test(at(end))) end++;
  if (end >= lines || end < line) return null;

  const source: string[] = [];
  for (let i = start + 1; i < end; i++) source.push(at(i));
  return { startLine: start, endLine: end, source: source.join("\n") };
}

/**
 * Every closed fenced block whose info string is exactly `language`. A fence
 * shown inside another code block, such as an example in ````markdown, is
 * content of that block and is skipped.
 */
export function findFencedBlocks(doc: LineSource, language: string): CardBlockAt[] {
  const blocks: CardBlockAt[] = [];
  let open: { char: string; length: number; start: number; wanted: boolean } | null = null;
  const lines = doc.lineCount();
  for (let i = 0; i < lines; i++) {
    const match = FENCE.exec(stripContainer(doc.getLine(i)));
    if (match === null) continue;
    const run = match[1] ?? "";
    const info = (match[2] ?? "").trim();
    if (open === null) {
      open = { char: run.charAt(0), length: run.length, start: i, wanted: info === language };
    } else if (run.charAt(0) === open.char && run.length >= open.length && info === "") {
      if (open.wanted) {
        const source: string[] = [];
        for (let j = open.start + 1; j < i; j++) source.push(stripContainer(doc.getLine(j)));
        blocks.push({ startLine: open.start, endLine: i, source: source.join("\n") });
      }
      open = null;
    }
  }
  return blocks;
}

/**
 * Text that replaces line[from..to] with a fenced block. A fence must start
 * its own line, and inside a list item or blockquote every following line
 * needs the same indentation or `>` to stay in that container.
 */
export function blockReplacement(line: string, from: number, to: number, block: string): string {
  const match = CONTAINER.exec(line);
  const quote = match?.[1] ?? "";
  const list = match?.[2] ?? "";
  const continuation = quote + " ".repeat(list.length);
  const ownLine = line.slice(0, from).trim() === (quote + list).trim();

  const [first = "", ...rest] = block.split("\n");
  let text = (ownLine ? "" : "\n" + continuation) + first;
  for (const blockLine of rest) text += "\n" + continuation + blockLine;
  if (line.slice(to).trim() !== "") text += "\n" + continuation;
  return text;
}

/** The URL may have moved while its page was being fetched; find the copy closest to where it was. */
export function locateNearest(text: string, needle: string, expectedOffset: number): number {
  let best = -1;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
    if (best === -1 || Math.abs(i - expectedOffset) < Math.abs(best - expectedOffset)) best = i;
  }
  return best;
}
