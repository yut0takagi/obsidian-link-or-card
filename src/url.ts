const WEB_PROTOCOLS = new Set(["http:", "https:"]);

/** Returns the value only when it is an absolute http(s) URL; anything else could run script or leak data. */
export function safeHttpUrl(value: string | undefined): string | null {
  if (value === undefined) return null;
  try {
    const url = new URL(value);
    return WEB_PROTOCOLS.has(url.protocol) && url.hostname !== "" ? value : null;
  } catch {
    return null;
  }
}

/** The clipboard counts as "a URL" only when it holds exactly one http(s) URL and nothing else. */
export function parsePastedUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;
  return safeHttpUrl(trimmed);
}

/**
 * A link dragged from a browser carries `text/uri-list`. Text dragged within
 * the editor carries only `text/plain`, so reading the list alone keeps the
 * menu away from ordinary drag-and-drop editing.
 */
export function parseDroppedUrl(uriList: string): string | null {
  const uris = uriList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
  return uris.length === 1 ? parsePastedUrl(uris[0] ?? "") : null;
}
