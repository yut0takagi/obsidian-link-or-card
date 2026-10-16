import { describe, expect, it } from "vitest";
import {
  blockReplacement,
  canTransformPaste,
  findCardBlockAt,
  findLinkAt,
  isInsideCodeFence,
  isInsideFrontmatter,
  isInsideTable,
  locateNearest,
} from "../src/editorText";

const doc = (text: string) => {
  const lines = text.split("\n");
  return { getLine: (line: number) => lines[line] ?? "", lineCount: () => lines.length };
};

describe("isInsideCodeFence", () => {
  it("is true between an opening and a closing fence", () => {
    const d = doc("a\n```js\ncode\n```\nb");
    expect(isInsideCodeFence(d, 0)).toBe(false);
    expect(isInsideCodeFence(d, 2)).toBe(true);
    expect(isInsideCodeFence(d, 4)).toBe(false);
  });

  it("only closes on a fence of the same character and at least the same length", () => {
    expect(isInsideCodeFence(doc("~~~\n```\n~~~\nx"), 3)).toBe(false);
    expect(isInsideCodeFence(doc("~~~\n```\nx"), 2)).toBe(true);
    expect(isInsideCodeFence(doc("````\n```\nstill\n````\nout"), 2)).toBe(true);
    expect(isInsideCodeFence(doc("````\n```\nstill\n````\nout"), 4)).toBe(false);
  });

  it("treats an unclosed fence as open to the end", () => {
    expect(isInsideCodeFence(doc("```\nx\ny"), 2)).toBe(true);
  });
});

describe("isInsideFrontmatter", () => {
  it("covers the lines from the opening to the closing ---", () => {
    const d = doc("---\ntitle: a\n---\nbody");
    expect(isInsideFrontmatter(d, 0)).toBe(true);
    expect(isInsideFrontmatter(d, 1)).toBe(true);
    expect(isInsideFrontmatter(d, 2)).toBe(true);
    expect(isInsideFrontmatter(d, 3)).toBe(false);
  });

  it("ignores --- that is not on the first line or never closes", () => {
    expect(isInsideFrontmatter(doc("text\n---\nx\n---"), 2)).toBe(false);
    expect(isInsideFrontmatter(doc("---\nno end"), 1)).toBe(false);
  });
});

describe("canTransformPaste", () => {
  it("allows ordinary prose", () => {
    expect(canTransformPaste(doc("hello "), 0, 6)).toBe(true);
    expect(canTransformPaste(doc("`a` and "), 0, 8)).toBe(true);
  });

  it("refuses inside code, frontmatter and on fence lines", () => {
    expect(canTransformPaste(doc("```\n\n```"), 1, 0)).toBe(false);
    expect(canTransformPaste(doc("---\nsource: \n---"), 1, 8)).toBe(false);
    expect(canTransformPaste(doc("```"), 0, 3)).toBe(false);
    expect(canTransformPaste(doc("use `foo "), 0, 9)).toBe(false);
  });

  it("refuses where the URL is clearly part of other syntax", () => {
    expect(canTransformPaste(doc("[title]("), 0, 8)).toBe(false);
    expect(canTransformPaste(doc("<"), 0, 1)).toBe(false);
    expect(canTransformPaste(doc('<img src="'), 0, 10)).toBe(false);
  });
});

describe("isInsideTable", () => {
  const table = doc("before\n\n| a | b |\n| :-- | --: |\n| x |  |\n| y | z |\n\nafter | pipe");

  it("covers the header, the delimiter row and every body row", () => {
    for (const line of [2, 3, 4, 5]) expect(isInsideTable(table, line)).toBe(true);
  });

  it("ends at a blank line and ignores pipes in ordinary prose", () => {
    expect(isInsideTable(table, 0)).toBe(false);
    expect(isInsideTable(table, 6)).toBe(false);
    expect(isInsideTable(table, 7)).toBe(false);
    expect(isInsideTable(doc("a | b\nc | d"), 1)).toBe(false);
  });

  it("finds tables without outer pipes and inside blockquotes", () => {
    expect(isInsideTable(doc("a | b\n--- | ---\nx | y"), 2)).toBe(true);
    expect(isInsideTable(doc("> | a |\n> | --- |\n> | x |"), 2)).toBe(true);
  });

  it("does not read a setext heading or a thematic break as a table", () => {
    expect(isInsideTable(doc("a | b\n---"), 0)).toBe(false);
    expect(isInsideTable(doc("text\n---\nmore"), 2)).toBe(false);
  });
});

describe("findLinkAt", () => {
  it("finds a bare URL around the cursor, including right after it", () => {
    const line = "see https://example.com/a now";
    const expected = { kind: "bare", from: 4, to: 25, url: "https://example.com/a" };
    expect(findLinkAt(line, 10)).toEqual(expected);
    expect(findLinkAt(line, 25)).toEqual(expected);
    expect(findLinkAt(line, 1)).toBeNull();
  });

  it("leaves trailing punctuation and unbalanced parentheses out", () => {
    expect(findLinkAt("go to https://example.com/a.", 10)?.url).toBe("https://example.com/a");
    expect(findLinkAt("(see https://example.com/a)", 10)?.url).toBe("https://example.com/a");
    expect(findLinkAt("x https://en.wikipedia.org/wiki/Foo_(bar) y", 10)?.url).toBe("https://en.wikipedia.org/wiki/Foo_(bar)");
  });

  it("finds a Markdown link and unescapes its text", () => {
    const line = "a [T \\] x](https://example.com) b";
    expect(findLinkAt(line, 4)).toEqual({ kind: "markdown", from: 2, to: 31, url: "https://example.com", text: "T ] x" });
    expect(findLinkAt(line, 20)?.kind).toBe("markdown");
  });

  it("ignores image embeds", () => {
    expect(findLinkAt("![alt](https://example.com/x.png)", 10)).toBeNull();
  });
});

describe("findCardBlockAt", () => {
  const d = doc("a\n```linkcard\nurl: https://x.com\ntitle: X\n```\nb");

  it("finds the block from any of its lines", () => {
    const block = { startLine: 1, endLine: 4, source: "url: https://x.com\ntitle: X" };
    expect(findCardBlockAt(d, 1)).toEqual(block);
    expect(findCardBlockAt(d, 2)).toEqual(block);
    expect(findCardBlockAt(d, 4)).toEqual(block);
  });

  it("returns null outside the block or for other languages", () => {
    expect(findCardBlockAt(d, 0)).toBeNull();
    expect(findCardBlockAt(d, 5)).toBeNull();
    expect(findCardBlockAt(doc("```js\nurl: x\n```"), 1)).toBeNull();
    expect(findCardBlockAt(doc("```linkcard\nurl: x"), 1)).toBeNull();
  });

  it("does not mistake the opener of a following block for a card", () => {
    expect(findCardBlockAt(doc("```linkcard\nurl: x\n```\n```\ncode\n```"), 3)).toBeNull();
  });

  it("strips blockquote and list markers from the source", () => {
    const quoted = doc("> ```linkcard\n> url: https://x.com\n> ```");
    expect(findCardBlockAt(quoted, 1)).toEqual({ startLine: 0, endLine: 2, source: "url: https://x.com" });
    const listed = doc("- ```linkcard\n  url: https://x.com\n  ```");
    expect(findCardBlockAt(listed, 1)).toEqual({ startLine: 0, endLine: 2, source: "url: https://x.com" });
  });
});

describe("blockReplacement", () => {
  const B = "```linkcard\nurl: https://x.com\n```";

  it("uses the block as-is when the URL is alone on its line", () => {
    expect(blockReplacement("https://x.com", 0, 13, B)).toBe(B);
  });

  it("moves the block onto its own lines when text surrounds the URL", () => {
    expect(blockReplacement("see https://x.com", 4, 17, B)).toBe("\n" + B);
    expect(blockReplacement("https://x.com tail", 0, 13, B)).toBe(B + "\n");
  });

  it("keeps the block inside a list item or blockquote", () => {
    expect(blockReplacement("- https://x.com", 2, 15, B)).toBe("```linkcard\n  url: https://x.com\n  ```");
    expect(blockReplacement("> https://x.com", 2, 15, B)).toBe("```linkcard\n> url: https://x.com\n> ```");
    expect(blockReplacement("- see https://x.com", 6, 19, B)).toBe("\n  ```linkcard\n  url: https://x.com\n  ```");
  });
});

describe("locateNearest", () => {
  it("returns the occurrence closest to the expected offset", () => {
    expect(locateNearest("a URL b URL c", "URL", 8)).toBe(8);
    expect(locateNearest("a URL b URL c", "URL", 0)).toBe(2);
    expect(locateNearest("a URL b URL c", "URL", 100)).toBe(8);
    expect(locateNearest("nothing", "URL", 0)).toBe(-1);
  });
});
