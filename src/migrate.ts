import { formatCardBlock } from "./cardBlock";
import type { CardData, CardField } from "./cardBlock";
import { blockReplacement, findFencedBlocks } from "./editorText";
import type { LineSource } from "./editorText";
import { safeHttpUrl } from "./url";

/**
 * Auto Card Link's block language. Registering a renderer for it would clash
 * with that plugin while both are installed, so blocks are converted instead.
 */
export const CARDLINK_LANGUAGE = "cardlink";

/** `host` is dropped: the card derives it from the url. */
const FIELDS: ReadonlySet<string> = new Set<CardField>(["url", "title", "description", "image", "favicon", "site"]);

const KEY_LINE = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/;

const ESCAPES: Record<string, string> = { "\\": "\\", '"': '"', "/": "/", " ": " ", t: "\t", n: "\n", r: "\r" };
const HEX_ESCAPES: Record<string, number> = { x: 2, u: 4, U: 8 };

/** A YAML double-quoted scalar on one line; null when it does not close or uses an escape we do not know. */
function readDoubleQuoted(raw: string): string | null {
  let out = "";
  for (let i = 1; i < raw.length; i++) {
    const char = raw.charAt(i);
    if (char === '"') return /^\s*(#.*)?$/.test(raw.slice(i + 1)) ? out : null;
    if (char !== "\\") {
      out += char;
      continue;
    }
    const next = raw.charAt(++i);
    const simple = ESCAPES[next];
    const digits = HEX_ESCAPES[next];
    if (simple !== undefined) out += simple;
    else if (digits !== undefined) {
      const hex = raw.slice(i + 1, i + 1 + digits);
      const code = /^[0-9a-fA-F]+$/.test(hex) && hex.length === digits ? parseInt(hex, 16) : -1;
      if (code < 0 || code > 0x10ffff) return null;
      out += String.fromCodePoint(code);
      i += digits;
    } else return null;
  }
  return null;
}

/** A YAML single-quoted scalar on one line, where '' stands for '. */
function readSingleQuoted(raw: string): string | null {
  const match = /^'((?:[^']|'')*)'\s*(#.*)?$/.exec(raw);
  return match === null ? null : (match[1] ?? "").replace(/''/g, "'");
}

/** Block scalars, flow collections, anchors and tags are not something this reader understands. */
const UNSUPPORTED_START = /^[|>[{&*!%@`]/;

function readValue(raw: string): string | null {
  if (raw.startsWith('"')) return readDoubleQuoted(raw);
  if (raw.startsWith("'")) return readSingleQuoted(raw);
  if (UNSUPPORTED_START.test(raw)) return null;
  return raw.replace(/\s+#.*$/, "").trim();
}

/**
 * Reads the YAML subset Auto Card Link writes: one `key: value` per line,
 * plain or quoted. Anything richer returns null, so the block is left as it
 * is rather than converted from a half-read source.
 */
export function parseCardlinkSource(source: string): CardData | null {
  const data: Partial<CardData> = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const match = KEY_LINE.exec(trimmed);
    if (match === null) return null;
    const value = readValue((match[2] ?? "").trim());
    if (value === null) return null;
    const key = (match[1] ?? "").toLowerCase();
    if (FIELDS.has(key) && value !== "") data[key as CardField] = value;
  }
  const url = safeHttpUrl(data.url);
  return url === null ? null : { ...data, url };
}

export interface TextChange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  text: string;
}

/**
 * Edits that turn every readable cardlink block into a linkcard block. All
 * positions refer to the document as it is now, as an editor transaction expects.
 */
export function cardlinkConversions(doc: LineSource): { changes: TextChange[]; skipped: number } {
  const changes: TextChange[] = [];
  let skipped = 0;
  for (const block of findFencedBlocks(doc, CARDLINK_LANGUAGE)) {
    const data = parseCardlinkSource(block.source);
    if (data === null) {
      skipped++;
      continue;
    }
    const opener = doc.getLine(block.startLine);
    const ch = opener.search(/`{3}|~{3}/);
    changes.push({
      from: { line: block.startLine, ch },
      to: { line: block.endLine, ch: doc.getLine(block.endLine).length },
      text: blockReplacement(opener, ch, opener.length, formatCardBlock(data)),
    });
  }
  return { changes, skipped };
}
