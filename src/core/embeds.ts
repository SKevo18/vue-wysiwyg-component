export const EMBED_PROVIDERS = ["youtube", "vimeo", "loom", "figma", "gist", "maps", "tweet", "codepen", "generic"] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];

export interface EmbedTarget {
  provider: EmbedProvider;
  /** iframe address */
  src: string;
}

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const host = (url: URL) => url.hostname.toLowerCase().replace(/^(www|m)\./, "");

/** `1h2m3s`, `90s` or `90` as seconds */
function seconds(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

function youtube(url: URL): string | null {
  const h = host(url);
  let id: string | null = null;
  if (h === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (h === "youtube.com" || h === "youtube-nocookie.com" || h === "music.youtube.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") id = parts[1] ?? null;
  }
  if (!id || !/^[\w-]{6,}$/.test(id)) return null;
  const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
}

function vimeo(url: URL): string | null {
  const h = host(url);
  if (h !== "vimeo.com" && h !== "player.vimeo.com") return null;
  const m = /^\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/.exec(url.pathname);
  if (!m) return null;
  const hash = m[2] ?? url.searchParams.get("h");
  return `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ""}`;
}

function loom(url: URL): string | null {
  const m = host(url) === "loom.com" ? /^\/(?:share|embed)\/([\da-f]+)/.exec(url.pathname) : null;
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

function figma(url: URL): string | null {
  const h = host(url);
  if (h === "embed.figma.com") return url.href;
  if (h !== "figma.com" || !/^\/(file|design|proto|board|slides|deck)\//.test(url.pathname)) return null;
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url.href)}`;
}

function gist(url: URL): string | null {
  const m = host(url) === "gist.github.com" ? /^\/([\w-]+)\/([\da-f]+)/.exec(url.pathname) : null;
  return m ? `https://gist.github.com/${m[1]}/${m[2]}.pibb` : null;
}

function maps(url: URL): string | null {
  const h = host(url);
  const google = /^(maps\.)?google\.[a-z.]+$/.test(h);
  if (!google || (h.startsWith("google.") && !url.pathname.startsWith("/maps"))) return null;
  if (url.pathname.startsWith("/maps/embed")) return url.href;
  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  const place = /\/place\/([^/]+)/.exec(url.pathname)?.[1];
  const at = /\/@(-?[\d.]+),(-?[\d.]+),(\d+(?:\.\d+)?)z/.exec(url.pathname);
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  else if (place) params.set("q", decodeURIComponent(place.replace(/\+/g, " ")));
  else if (at) params.set("q", `${at[1]},${at[2]}`);
  else return null;
  if (at) params.set("z", String(Math.round(Number(at[3]))));
  params.set("output", "embed");
  return `https://maps.google.com/maps?${params}`;
}

function tweet(url: URL): string | null {
  const h = host(url);
  if (h !== "twitter.com" && h !== "x.com" && h !== "mobile.twitter.com") return null;
  const m = /^\/[\w]+\/status(?:es)?\/(\d+)/.exec(url.pathname);
  return m ? `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&dnt=true` : null;
}

function codepen(url: URL): string | null {
  const m = host(url) === "codepen.io" ? /^\/([\w-]+)\/(?:pen|embed|full|details)\/(\w+)/.exec(url.pathname) : null;
  return m ? `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result` : null;
}

const DETECTORS: [EmbedProvider, (url: URL) => string | null][] = [
  ["youtube", youtube],
  ["vimeo", vimeo],
  ["loom", loom],
  ["figma", figma],
  ["gist", gist],
  ["maps", maps],
  ["tweet", tweet],
  ["codepen", codepen],
];

/** null for anything but an https address */
export function embedFor(raw: string): EmbedTarget | null {
  const url = parseUrl(raw);
  if (!url) return null;
  for (const [provider, detect] of DETECTORS) {
    const src = detect(url);
    if (src) return { provider, src };
  }
  return { provider: "generic", src: url.href };
}

/** null keeps the provider's own shape (16:9 video or the default height) */
export const EMBED_HEIGHTS: Record<EmbedProvider, number | null> = {
  youtube: null,
  vimeo: null,
  loom: null,
  figma: 450,
  gist: 320,
  maps: 400,
  tweet: 560,
  codepen: 420,
  generic: 420,
};

export const EMBED_MIN_HEIGHT = 120;
export const EMBED_MAX_HEIGHT = 1600;

/** sandbox flags; a page of the host's own origin loses `allow-same-origin`, so it cannot reach the editor */
export function embedSandbox(src: string): string {
  const flags = ["allow-scripts", "allow-popups", "allow-popups-to-escape-sandbox", "allow-presentation", "allow-forms"];
  let same = true;
  try {
    same = typeof location !== "undefined" && new URL(src).origin === location.origin;
  } catch {
    // an unparsable address keeps the strict sandbox
  }
  if (!same) flags.push("allow-same-origin");
  return flags.join(" ");
}

export function isHttpsUrl(raw: string): boolean {
  return parseUrl(raw) !== null;
}

/** a lone URL as typed or pasted; http is allowed for links and bookmarks */
export function loneUrl(text: string): string | null {
  const v = text.trim();
  if (!v || /\s/.test(v)) return null;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? v : null;
  } catch {
    return null;
  }
}
