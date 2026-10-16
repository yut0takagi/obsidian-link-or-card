import { describe, expect, it } from "vitest";
import { isPrivateUrl, parseDroppedUrl, parsePastedUrl, safeHttpUrl } from "../src/url";

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

describe("isPrivateUrl", () => {
  const priv = (host: string) => isPrivateUrl(`http://${host}/`);

  it("flags loopback, private, shared and link-local IPv4 ranges at their edges", () => {
    for (const host of [
      "0.0.0.0",
      "127.0.0.1",
      "127.255.255.255",
      "10.0.0.0",
      "10.255.255.255",
      "100.64.0.0",
      "100.127.255.255",
      "169.254.0.0",
      "169.254.255.255",
      "172.16.0.0",
      "172.31.255.255",
      "192.168.0.0",
      "192.168.255.255",
    ]) {
      expect(priv(host), host).toBe(true);
    }
  });

  it("lets the public addresses next to those ranges through", () => {
    for (const host of ["1.0.0.0", "9.255.255.255", "11.0.0.0", "100.63.255.255", "100.128.0.0", "126.255.255.255", "128.0.0.0", "169.253.255.255", "169.255.0.0", "172.15.255.255", "172.32.0.0", "192.167.255.255", "192.169.0.0"]) {
      expect(priv(host), host).toBe(false);
    }
  });

  it("sees through other spellings of an IPv4 address", () => {
    expect(priv("2130706433")).toBe(true);
    expect(priv("0x7f.1")).toBe(true);
    expect(priv("0177.0.0.1")).toBe(true);
    expect(priv("127.1")).toBe(true);
  });

  it("flags IPv6 loopback, unspecified, unique local, link-local and old site-local addresses", () => {
    for (const host of ["[::1]", "[::]", "[fc00::1]", "[fdff:ffff::1]", "[fe80::1]", "[febf::1]", "[FE80::1]", "[fec0::1]"]) {
      expect(priv(host), host).toBe(true);
    }
    for (const host of ["[fbff::1]", "[fe7f::1]", "[2001:db8::1]", "[2606:4700::1111]"]) {
      expect(priv(host), host).toBe(false);
    }
  });

  it("checks the IPv4 address inside IPv4-mapped and translated IPv6 addresses", () => {
    expect(priv("[::ffff:127.0.0.1]")).toBe(true);
    expect(priv("[::ffff:7f00:1]")).toBe(true);
    expect(priv("[::ffff:10.1.2.3]")).toBe(true);
    expect(priv("[64:ff9b::192.168.0.1]")).toBe(true);
    expect(priv("[::ffff:8.8.8.8]")).toBe(false);
  });

  it("flags local host names, with or without a trailing dot", () => {
    for (const host of ["localhost", "LOCALHOST.", "app.localhost", "printer.local", "db.internal", "intranet"]) {
      expect(priv(host), host).toBe(true);
    }
    for (const host of ["example.com", "localhost.example.com", "local.example.com", "example.internal.example", "www.example.com."]) {
      expect(priv(host), host).toBe(false);
    }
  });

  it("treats URLs it cannot parse as private, so they are never fetched", () => {
    expect(isPrivateUrl("not a url")).toBe(true);
  });
});
