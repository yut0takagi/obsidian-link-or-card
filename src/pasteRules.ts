import { pasteChoices } from "./choices";
import type { Style } from "./choices";

export interface DomainRules {
  /** Pastes from these hosts are left to Obsidian; no menu. */
  exclude: readonly string[];
  /** Pastes from these hosts become a card without asking. */
  card: readonly string[];
  /** Pastes from these hosts become a titled link without asking. */
  link: readonly string[];
}

export type DomainRule = keyof DomainRules;

/** Lowercased, punycoded, without the trailing dot that would otherwise slip past a rule. */
function hostOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/\.$/, "");
    return host === "" ? null : host;
  } catch {
    return null;
  }
}

/**
 * One host per line. A scheme, port, path or leading `*.` is tolerated, so
 * copying a URL straight into the list works. Settings come from data.json,
 * which may hold anything, hence the `unknown`.
 */
export function parseDomainList(text: unknown): string[] {
  if (typeof text !== "string") return [];
  const hosts = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const entry = line.trim().replace(/^\*?\./, "");
    if (entry === "" || entry.startsWith("#")) continue;
    const host = hostOf(entry.includes("://") ? entry : `http://${entry}`);
    if (host !== null) hosts.add(host);
  }
  return [...hosts];
}

/**
 * Hosts are compared whole, label by label: `example.com` covers
 * `www.example.com` but never `badexample.com` or `example.com.evil.test`.
 */
const covers = (rule: string, host: string): boolean => host === rule || host.endsWith("." + rule);

/**
 * The most specific matching host wins. On a tie, excluding wins, since it is
 * the rule that leaves the paste alone; a card/link tie is left to the menu.
 */
export function domainRuleFor(url: string, rules: DomainRules): DomainRule | null {
  const host = hostOf(url);
  if (host === null) return null;
  const best: Record<DomainRule, number> = { exclude: -1, card: -1, link: -1 };
  for (const rule of ["exclude", "card", "link"] as const) {
    for (const domain of rules[rule]) {
      if (covers(domain, host)) best[rule] = Math.max(best[rule], domain.length);
    }
  }
  const top = Math.max(best.exclude, best.card, best.link);
  if (top < 0) return null;
  if (best.exclude === top) return "exclude";
  if (best.card === top && best.link === top) return null;
  return best.card === top ? "card" : "link";
}

export type PasteDecision = { action: "ignore" } | { action: "ask"; styles: Style[] } | { action: "apply"; style: Style };

/** What to do with a URL pasted or dropped into prose. A rule that cannot apply here falls back to the menu. */
export function decidePaste(url: string, rules: DomainRules, inTable: boolean): PasteDecision {
  const rule = domainRuleFor(url, rules);
  if (rule === "exclude") return { action: "ignore" };
  const styles = pasteChoices(inTable);
  if (rule !== null && styles.includes(rule)) return { action: "apply", style: rule };
  return { action: "ask", styles };
}
