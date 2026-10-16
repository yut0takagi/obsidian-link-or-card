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

/** host[:port] for messages; the input itself when it does not parse. */
export function displayHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** IPv4 networks that are not on the public internet, as [network, prefix length]. */
const PRIVATE_V4: readonly [number, number][] = [
  [0x00000000, 8], // 0.0.0.0/8, "this network", which reaches the machine itself
  [0x0a000000, 8], // 10.0.0.0/8
  [0x64400000, 10], // 100.64.0.0/10, carrier-grade NAT
  [0x7f000000, 8], // 127.0.0.0/8, loopback
  [0xa9fe0000, 16], // 169.254.0.0/16, link-local and cloud metadata
  [0xac100000, 12], // 172.16.0.0/12
  [0xc0a80000, 16], // 192.168.0.0/16
];

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal"];

function ipv4(host: string): number | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (match === null) return null;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return octets.reduce((value, octet) => value * 256 + octet, 0);
}

const isPrivateV4 = (ip: number): boolean =>
  PRIVATE_V4.some(([network, bits]) => Math.floor(ip / 2 ** (32 - bits)) === Math.floor(network / 2 ** (32 - bits)));

/** The eight 16-bit groups of an IPv6 address in the compressed hex form URL serialises it to. */
function ipv6(host: string): number[] | null {
  const halves = host.split("::");
  if (halves.length > 2) return null;
  const groups = (part: string) => (part === "" ? [] : part.split(":").map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN)));
  const head = groups(halves[0] ?? "");
  const tail = groups(halves[1] ?? "");
  const missing = 8 - head.length - tail.length;
  if ([...head, ...tail].some(Number.isNaN) || (halves.length === 1 ? missing !== 0 : missing < 1)) return null;
  return [...head, ...new Array<number>(halves.length === 2 ? missing : 0).fill(0), ...tail];
}

function isPrivateV6(groups: number[]): boolean {
  const [first = 0, second = 0] = groups;
  const embedded = (groups[6] ?? 0) * 65536 + (groups[7] ?? 0);
  const zeros = (from: number, to: number) => groups.slice(from, to).every((group) => group === 0);
  // ::/96 (including :: and ::1), ::ffff:0:0/96 (IPv4-mapped) and 64:ff9b::/96 (NAT64) carry an IPv4 address.
  if (zeros(0, 6) || (zeros(0, 5) && groups[5] === 0xffff) || (first === 0x64 && second === 0xff9b && zeros(2, 6))) {
    return isPrivateV4(embedded);
  }
  return (
    (first & 0xfe00) === 0xfc00 || // fc00::/7, unique local
    (first & 0xffc0) === 0xfe80 || // fe80::/10, link-local
    (first & 0xffc0) === 0xfec0 // fec0::/10, the retired site-local range
  );
}

/**
 * Whether the URL points at this machine or a local network rather than the
 * public web: loopback, private, link-local and unique-local IP addresses
 * (IPv4-mapped IPv6 included), and localhost, *.localhost, *.local,
 * *.internal or single-label host names. URL has already normalised forms
 * such as 2130706433 or 0x7f.1 to dotted IPv4. A public name that resolves to
 * a private address cannot be detected here, since requestUrl does not expose
 * the resolved address. Unparseable URLs count as private.
 */
export function isPrivateUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return true;
  }
  if (host.startsWith("[")) {
    const groups = ipv6(host.slice(1, -1));
    return groups === null || isPrivateV6(groups);
  }
  const v4 = ipv4(host);
  if (v4 !== null) return isPrivateV4(v4);
  if (host === "localhost" || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  // A name without a dot only resolves through local search domains or a hosts file.
  return !host.includes(".");
}
