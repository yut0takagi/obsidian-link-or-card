import { describe, expect, it } from "vitest";
import { parseDroppedUrl, parsePastedUrl, safeHttpUrl } from "../src/url";

describe("parsePastedUrl", () => {
  it("accepts a single http or https URL", () => {
    expect(parsePastedUrl("https://example.com/a?b=1#c")).toBe("https://example.com/a?b=1#c");
    expect(parsePastedUrl("http://example.com")).toBe("http://example.com");
  });

  it("trims surrounding whitespace and newlines", () => {
    expect(parsePastedUrl("  https://example.com/a \n")).toBe("https://example.com/a");
  });

  it("rejects text that is not only a URL", () => {
    expect(parsePastedUrl("see https://example.com")).toBeNull();
    expect(parsePastedUrl("https://example.com and more")).toBeNull();
    expect(parsePastedUrl("https://a.com\nhttps://b.com")).toBeNull();
    expect(parsePastedUrl("")).toBeNull();
  });

  it("rejects other schemes and malformed URLs", () => {
    expect(parsePastedUrl("ftp://example.com")).toBeNull();
    expect(parsePastedUrl("javascript:alert(1)")).toBeNull();
    expect(parsePastedUrl("obsidian://open?vault=x")).toBeNull();
    expect(parsePastedUrl("https://")).toBeNull();
    expect(parsePastedUrl("example.com")).toBeNull();
  });
});

describe("safeHttpUrl", () => {
  it("returns the URL for http and https", () => {
    expect(safeHttpUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
  });

  it("returns null for anything else", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:image/png;base64,AAAA")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});

describe("parseDroppedUrl", () => {
  it("takes the one URL of a text/uri-list, skipping comment lines", () => {
    expect(parseDroppedUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(parseDroppedUrl("# dragged from a browser\r\nhttps://example.com/a\r\n")).toBe("https://example.com/a");
  });

  it("refuses several URLs, other schemes and an empty list", () => {
    expect(parseDroppedUrl("https://example.com/a\r\nhttps://example.com/b")).toBeNull();
    expect(parseDroppedUrl("obsidian://open?vault=x")).toBeNull();
    expect(parseDroppedUrl("")).toBeNull();
  });
});
