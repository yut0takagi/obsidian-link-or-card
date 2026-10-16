export type Style = "card" | "link" | "plain";

export type LinkKind = "bare" | "markdown" | "card";

/** What each kind of link can become; its current form is never offered. */
const CONVERSIONS: Record<LinkKind, readonly Style[]> = {
  bare: ["card", "link"],
  markdown: ["card", "plain"],
  card: ["link", "plain"],
};

const PASTE: readonly Style[] = ["card", "link", "plain"];

/** A table row must stay on one line, and a card is a multi-line fenced block. */
const fits = (inTable: boolean) => (style: Style) => !(inTable && style === "card");

export function pasteChoices(inTable: boolean): Style[] {
  return PASTE.filter(fits(inTable));
}

export function conversionsFor(kind: LinkKind, inTable: boolean): Style[] {
  return CONVERSIONS[kind].filter(fits(inTable));
}
