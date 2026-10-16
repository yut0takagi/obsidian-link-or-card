/**
 * Cuts a fetched title to at most `max` characters, the ellipsis included.
 * Counts code points so an emoji is never split in half. 0 means no limit.
 */
export function truncateTitle(title: string, max: number): string {
  const limit = Math.floor(max);
  if (!Number.isFinite(limit) || limit <= 0) return title;
  const chars = Array.from(title);
  if (chars.length <= limit) return title;
  return chars.slice(0, limit - 1).join("").trimEnd() + "…";
}
