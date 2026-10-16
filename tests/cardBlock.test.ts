import { describe, expect, it } from "vitest";
import { CARD_LANGUAGE, emptyCardFields, formatCardBlock, mergeCardData, parseCardBlock, sameCardData } from "../src/cardBlock";

describe("formatCardBlock", () => {
  it("writes a fenced block with one key per line, skipping empty fields", () => {
    const block = formatCardBlock({
      url: "https://example.com/a",
      title: "Title",
      description: "",
      image: "https://example.com/og.png",
    });
    expect(block).toBe(
      ["```" + CARD_LANGUAGE, "url: https://example.com/a", "title: Title", "image: https://example.com/og.png", "```"].join("\n"),
    );
  });

  it("keeps every value on one line", () => {
    const block = formatCardBlock({ url: "https://example.com", description: "line one\n\n line two\t end" });
    expect(block).toContain("description: line one line two end");
  });

  it("cannot be closed early by a value that contains a fence", () => {
    const block = formatCardBlock({ url: "https://example.com", title: "a ``` b" });
    const lines = block.split("\n");
    expect(lines.filter((line) => line.startsWith("```"))).toHaveLength(2);
  });
});

describe("parseCardBlock", () => {
  it("round-trips what formatCardBlock wrote", () => {
    const data = {
      url: "https://example.com/a?x=1",
      title: "Title: with colon",
      description: "Desc",
      image: "https://example.com/og.png",
      favicon: "https://example.com/favicon.ico",
      site: "Example",
    };
    const block = formatCardBlock(data);
    const body = block.split("\n").slice(1, -1).join("\n");
    expect(parseCardBlock(body)).toEqual(data);
  });

  it("ignores unknown keys, blank lines and surrounding quotes", () => {
    expect(parseCardBlock('\nurl: "https://example.com"\nfoo: bar\n\ntitle: \'T\'\n')).toEqual({
      url: "https://example.com",
      title: "T",
    });
  });

  it("returns null when url is missing", () => {
    expect(parseCardBlock("title: no url")).toBeNull();
  });
});

describe("mergeCardData", () => {
  const current = { url: "https://example.com/a", title: "My own title", image: "https://example.com/old.png", site: "Example" };
  const fetched = {
    url: "https://example.com/a",
    title: "Page title",
    description: "Desc",
    image: "https://example.com/new.png",
    favicon: "https://example.com/f.ico",
  };

  it("fills only the empty fields, so hand edits survive", () => {
    expect(mergeCardData(current, fetched, "fill")).toEqual({
      url: "https://example.com/a",
      title: "My own title",
      description: "Desc",
      image: "https://example.com/old.png",
      favicon: "https://example.com/f.ico",
      site: "Example",
    });
  });

  it("overwrites what the page provided when replacing, and keeps what it no longer has", () => {
    expect(mergeCardData(current, fetched, "replace")).toEqual({ ...fetched, site: "Example" });
  });

  it("never changes the url, even if the page reports another one", () => {
    const moved = { ...fetched, url: "https://example.org/elsewhere" };
    expect(mergeCardData(current, moved, "replace").url).toBe("https://example.com/a");
    expect(mergeCardData(current, moved, "fill").url).toBe("https://example.com/a");
  });
});

describe("emptyCardFields", () => {
  it("lists the fields a refresh could fill, never the url", () => {
    expect(emptyCardFields({ url: "https://example.com", title: "T", image: "https://example.com/i.png" })).toEqual([
      "description",
      "favicon",
      "site",
    ]);
    expect(emptyCardFields({ url: "https://example.com", title: "T", description: "D", image: "i", favicon: "f", site: "S" })).toEqual([]);
  });
});

describe("sameCardData", () => {
  it("compares every field", () => {
    expect(sameCardData({ url: "https://example.com", title: "T" }, { title: "T", url: "https://example.com" })).toBe(true);
    expect(sameCardData({ url: "https://example.com", title: "T" }, { url: "https://example.com", title: "U" })).toBe(false);
    expect(sameCardData({ url: "https://example.com" }, { url: "https://example.com", site: "S" })).toBe(false);
  });
});
