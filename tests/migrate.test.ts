import { describe, expect, it } from "vitest";
import { cardlinkConversions, parseCardlinkSource } from "../src/migrate";
import type { TextChange } from "../src/migrate";

const doc = (text: string) => {
  const lines = text.split("\n");
  return { getLine: (line: number) => lines[line] ?? "", lineCount: () => lines.length };
};

/** Applies changes the way an editor transaction does: every position refers to the original text. */
function apply(text: string, changes: TextChange[]): string {
  const lines = text.split("\n");
  const offset = (pos: { line: number; ch: number }) =>
    lines.slice(0, pos.line).reduce((sum, line) => sum + line.length + 1, 0) + pos.ch;
  return [...changes]
    .sort((a, b) => offset(b.from) - offset(a.from))
    .reduce((out, change) => out.slice(0, offset(change.from)) + change.text + out.slice(offset(change.to)), text);
}

const convert = (text: string) => {
  const { changes, skipped } = cardlinkConversions(doc(text));
  return { text: apply(text, changes), converted: changes.length, skipped };
};

/** What Auto Card Link writes: title and description double-quoted with \\ and \" escaped. */
const ACL_SOURCE = [
  "url: https://example.com/a",
  'title: "Say \\"hi\\" \\\\ there"',
  'description: "A page"',
  "host: example.com",
  "favicon: https://example.com/favicon.ico",
  "image: https://example.com/og.png",
].join("\n");

describe("parseCardlinkSource", () => {
  it("reads Auto Card Link's fields and drops host, which comes from the url", () => {
    expect(parseCardlinkSource(ACL_SOURCE)).toEqual({
      url: "https://example.com/a",
      title: 'Say "hi" \\ there',
      description: "A page",
      favicon: "https://example.com/favicon.ico",
      image: "https://example.com/og.png",
    });
  });

  it("reads single quotes, plain values with comments, and \\u escapes", () => {
    const source = "url: https://example.com/#frag # note\ntitle: 'It''s'\ndescription: \"caf\\u00e9\"";
    expect(parseCardlinkSource(source)).toEqual({ url: "https://example.com/#frag", title: "It's", description: "café" });
  });

  it("returns null rather than half-reading YAML it does not support", () => {
    expect(parseCardlinkSource("title: no url")).toBeNull();
    expect(parseCardlinkSource("url: javascript:alert(1)")).toBeNull();
    expect(parseCardlinkSource("url: https://example.com\ndescription: |\n  two\n  lines")).toBeNull();
    expect(parseCardlinkSource("url: https://example.com\ntitle: [[A note]]")).toBeNull();
    expect(parseCardlinkSource('url: https://example.com\ntitle: "never closed')).toBeNull();
    expect(parseCardlinkSource('url: https://example.com\ntitle: "bad \\q escape"')).toBeNull();
  });
});

describe("cardlinkConversions", () => {
  it("turns a cardlink block into a linkcard block in place", () => {
    const result = convert(["before", "```cardlink", ACL_SOURCE, "```", "after"].join("\n"));
    expect(result).toMatchObject({ converted: 1, skipped: 0 });
    expect(result.text).toBe(
      [
        "before",
        "```linkcard",
        "url: https://example.com/a",
        'title: Say "hi" \\ there',
        "description: A page",
        "image: https://example.com/og.png",
        "favicon: https://example.com/favicon.ico",
        "```",
        "after",
      ].join("\n"),
    );
  });

  it("keeps blocks inside list items and blockquotes", () => {
    expect(convert("- ```cardlink\n  url: https://example.com\n  ```").text).toBe("- ```linkcard\n  url: https://example.com\n  ```");
    expect(convert("> ```cardlink\n> url: https://example.com\n> ```").text).toBe("> ```linkcard\n> url: https://example.com\n> ```");
  });

  it("converts every block, and accepts ~~~ fences", () => {
    const text = "```cardlink\nurl: https://example.com/1\n```\n\n~~~cardlink\nurl: https://example.com/2\n~~~";
    expect(convert(text)).toEqual({
      text: "```linkcard\nurl: https://example.com/1\n```\n\n```linkcard\nurl: https://example.com/2\n```",
      converted: 2,
      skipped: 0,
    });
  });

  it("leaves examples inside other code blocks, linkcard blocks and unclosed blocks alone", () => {
    const text = [
      "````markdown",
      "```cardlink",
      "url: https://example.com",
      "```",
      "````",
      "```linkcard",
      "url: https://example.com",
      "```",
      "```cardlink",
      "url: https://example.com",
    ].join("\n");
    expect(convert(text)).toEqual({ text, converted: 0, skipped: 0 });
  });

  it("counts blocks it could not read and leaves them unchanged", () => {
    const text = "```cardlink\ntitle: no url\n```\n```cardlink\nurl: https://example.com\n```";
    expect(convert(text)).toEqual({
      text: "```cardlink\ntitle: no url\n```\n```linkcard\nurl: https://example.com\n```",
      converted: 1,
      skipped: 1,
    });
  });
});
