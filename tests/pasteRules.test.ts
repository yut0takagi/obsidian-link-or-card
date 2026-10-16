import { describe, expect, it } from "vitest";
import { decidePaste, domainRuleFor, parseDomainList } from "../src/pasteRules";
import type { DomainRules } from "../src/pasteRules";

const rules = (partial: Partial<DomainRules>): DomainRules => ({ exclude: [], card: [], link: [], ...partial });

describe("parseDomainList", () => {
  it("reads one host per line, lowercased, skipping blanks and # comments", () => {
    expect(parseDomainList("Example.com\n\n  docs.example.org  \n# a note\n")).toEqual(["example.com", "docs.example.org"]);
  });

  it("accepts a pasted URL, a port, a path or a leading *.", () => {
    expect(parseDomainList("https://www.example.com/watch?v=1\nexample.net:8080\nexample.org/path\n*.example.dev")).toEqual([
      "www.example.com",
      "example.net",
      "example.org",
      "example.dev",
    ]);
  });

  it("drops duplicates and entries that are not hosts, and ignores non-text values", () => {
    expect(parseDomainList("example.com\nEXAMPLE.com\nhttp://\n")).toEqual(["example.com"]);
    expect(parseDomainList(undefined)).toEqual([]);
    expect(parseDomainList(42)).toEqual([]);
  });
});

describe("domainRuleFor", () => {
  it("matches the host and its subdomains", () => {
    const r = rules({ card: ["example.com"] });
    expect(domainRuleFor("https://example.com/a", r)).toBe("card");
    expect(domainRuleFor("https://www.example.com/a", r)).toBe("card");
    expect(domainRuleFor("http://EXAMPLE.COM./a", r)).toBe("card");
  });

  it("is not fooled by lookalike hosts, paths, user info or query strings", () => {
    const r = rules({ exclude: ["example.com"] });
    expect(domainRuleFor("https://badexample.com/", r)).toBeNull();
    expect(domainRuleFor("https://example.com.evil.test/", r)).toBeNull();
    expect(domainRuleFor("https://evil.test/example.com", r)).toBeNull();
    expect(domainRuleFor("https://example.com@evil.test/", r)).toBeNull();
    expect(domainRuleFor("https://evil.test/?u=https://example.com", r)).toBeNull();
  });

  it("lets the most specific rule win, and excluding win a tie", () => {
    const r = rules({ card: ["example.com"], link: ["docs.example.com"] });
    expect(domainRuleFor("https://docs.example.com/x", r)).toBe("link");
    expect(domainRuleFor("https://www.example.com/x", r)).toBe("card");
    expect(domainRuleFor("https://example.com", rules({ exclude: ["example.com"], card: ["example.com"] }))).toBe("exclude");
  });

  it("returns null when card and link claim the same host, so the menu decides", () => {
    expect(domainRuleFor("https://example.com", rules({ card: ["example.com"], link: ["example.com"] }))).toBeNull();
  });

  it("returns null for URLs it cannot parse", () => {
    expect(domainRuleFor("not a url", rules({ card: ["example.com"] }))).toBeNull();
  });
});

describe("decidePaste", () => {
  const r = rules({ exclude: ["private.example"], card: ["card.example"], link: ["link.example"] });

  it("leaves excluded domains to Obsidian", () => {
    expect(decidePaste("https://private.example/a", r, false)).toEqual({ action: "ignore" });
  });

  it("applies the domain's style without asking", () => {
    expect(decidePaste("https://card.example/a", r, false)).toEqual({ action: "apply", style: "card" });
    expect(decidePaste("https://link.example/a", r, false)).toEqual({ action: "apply", style: "link" });
  });

  it("asks for other domains", () => {
    expect(decidePaste("https://other.example/a", r, false)).toEqual({ action: "ask", styles: ["card", "link", "plain"] });
  });

  it("falls back to asking without the card in a table, even for a card domain", () => {
    expect(decidePaste("https://card.example/a", r, true)).toEqual({ action: "ask", styles: ["link", "plain"] });
    expect(decidePaste("https://link.example/a", r, true)).toEqual({ action: "apply", style: "link" });
  });
});
