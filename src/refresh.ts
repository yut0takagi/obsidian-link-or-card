import { emptyCardFields, mergeCardData, sameCardData } from "./cardBlock";
import type { CardData } from "./cardBlock";
import { displayHost, isPrivateUrl } from "./url";

export type RefreshMode = "fill" | "replace";

export interface RefreshDeps {
  /** Called before any request, with the host the request would go to. */
  confirm(request: { host: string; mode: RefreshMode }): Promise<boolean>;
  fetch(url: string): Promise<CardData | null>;
}

export type RefreshOutcome =
  | { kind: "nothing-empty" }
  | { kind: "private"; host: string }
  | { kind: "cancelled" }
  | { kind: "failed" }
  | { kind: "unchanged" }
  | { kind: "updated"; data: CardData };

/**
 * A card's url may have been written by someone else, in a shared or synced
 * vault, and a refresh copies what the page says into the note. So a refresh
 * never sends a request without the user agreeing to the host first, and never
 * fetches a private or local address. Creating a card from a URL the user
 * pasted or dropped is their own choice and does not go through here.
 */
export async function planRefresh(current: CardData, mode: RefreshMode, deps: RefreshDeps): Promise<RefreshOutcome> {
  if (mode === "fill" && emptyCardFields(current).length === 0) return { kind: "nothing-empty" };
  const host = displayHost(current.url);
  if (isPrivateUrl(current.url)) return { kind: "private", host };
  if (!(await deps.confirm({ host, mode }))) return { kind: "cancelled" };
  const page = await deps.fetch(current.url);
  if (page === null) return { kind: "failed" };
  const data = mergeCardData(current, page, mode);
  return sameCardData(data, current) ? { kind: "unchanged" } : { kind: "updated", data };
}
