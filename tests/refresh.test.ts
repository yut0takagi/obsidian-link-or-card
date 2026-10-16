import { describe, expect, it, vi } from "vitest";
import { planRefresh } from "../src/refresh";
import type { RefreshDeps } from "../src/refresh";
import type { CardData } from "../src/cardBlock";

const CARD: CardData = { url: "https://example.com:8443/a", title: "Mine" };
const PAGE: CardData = { url: "https://example.com:8443/a", title: "Page", description: "Desc" };

const deps = (overrides: Partial<RefreshDeps> = {}) => ({
  confirm: vi.fn(async () => true),
  fetch: vi.fn(async () => PAGE),
  ...overrides,
});

describe("planRefresh", () => {
  it("asks before fetching, naming the host, and fetches only after a yes", async () => {
    let answer: (ok: boolean) => void = () => undefined;
    const d = deps({ confirm: vi.fn(() => new Promise<boolean>((resolve) => (answer = resolve))) });
    const pending = planRefresh(CARD, "fill", d);
    await Promise.resolve();
    expect(d.confirm).toHaveBeenCalledWith({ host: "example.com:8443", mode: "fill" });
    expect(d.fetch).not.toHaveBeenCalled();
    answer(true);
    expect(await pending).toEqual({ kind: "updated", data: { url: CARD.url, title: "Mine", description: "Desc" } });
    expect(d.fetch).toHaveBeenCalledWith(CARD.url);
  });

  it("makes no request when the confirmation is declined, in either mode", async () => {
    for (const mode of ["fill", "replace"] as const) {
      const d = deps({ confirm: vi.fn(async () => false) });
      expect(await planRefresh(CARD, mode, d)).toEqual({ kind: "cancelled" });
      expect(d.confirm).toHaveBeenCalledWith({ host: "example.com:8443", mode });
      expect(d.fetch).not.toHaveBeenCalled();
    }
  });

  it("refuses private and local addresses without asking or fetching", async () => {
    for (const url of ["http://localhost:8080/", "http://10.0.0.5/admin", "http://[::ffff:127.0.0.1]/", "http://wiki.internal/"]) {
      const d = deps();
      expect(await planRefresh({ url }, "fill", d)).toEqual({ kind: "private", host: new URL(url).host });
      expect(d.confirm).not.toHaveBeenCalled();
      expect(d.fetch).not.toHaveBeenCalled();
    }
  });

  it("does nothing at all when fill has no empty field to fill", async () => {
    const full: CardData = { url: CARD.url, title: "T", description: "D", image: "i", favicon: "f", site: "S" };
    const d = deps();
    expect(await planRefresh(full, "fill", d)).toEqual({ kind: "nothing-empty" });
    expect(d.confirm).not.toHaveBeenCalled();
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("overwrites when replacing, and reports failures and pages with nothing new", async () => {
    expect(await planRefresh(CARD, "replace", deps())).toEqual({ kind: "updated", data: PAGE });
    expect(await planRefresh(CARD, "fill", deps({ fetch: vi.fn(async () => null) }))).toEqual({ kind: "failed" });
    expect(await planRefresh(CARD, "fill", deps({ fetch: vi.fn(async () => ({ url: CARD.url })) }))).toEqual({ kind: "unchanged" });
  });
});
