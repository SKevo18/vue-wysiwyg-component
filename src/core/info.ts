export interface FenceInfo {
  kind: string;
  attrs: Record<string, string>;
}

export function parseInfo(info: string): FenceInfo {
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of info) {
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === " " && !inQuote) {
      if (cur) fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) fields.push(cur);
  const attrs: Record<string, string> = {};
  if (fields.length === 0) return { kind: "", attrs };
  for (const f of fields.slice(1)) {
    const eq = f.indexOf("=");
    if (eq < 0) attrs[f.toLowerCase()] = "true";
    else attrs[f.slice(0, eq).toLowerCase()] = f.slice(eq + 1);
  }
  return { kind: fields[0]!.toLowerCase(), attrs };
}

export function formatInfo(kind: string, attrs: Record<string, string | undefined>): string {
  const parts = [kind];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === "" || v === undefined) continue;
    if (v === "true") parts.push(k);
    else parts.push(/[\s"]/.test(v) ? `${k}="${v.replace(/"/g, "")}"` : `${k}=${v}`);
  }
  return parts.join(" ");
}

export function fenceFor(body: string): string {
  const ticks = body.match(/`{3,}/g);
  return ticks ? ticks.sort()[ticks.length - 1]! + "`" : "```";
}

export function blockBody(body: string): string {
  return body.replace(/^(?:[ \t]*\n)+/, "").replace(/(?:\n[ \t]*)+$/, "");
}

export function newBlockId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  let out = "";
  for (const b of arr) out += alphabet[b % alphabet.length];
  return out;
}

export function fenceOpen(line: string): { marker: string; info: string } | null {
  const trimmed = line.replace(/^ {0,3}/, "");
  if (line.length - trimmed.length > 3) return null;
  const m = /^(`{3,}|~{3,})(.*)$/.exec(trimmed);
  if (!m) return null;
  if (m[1]![0] === "`" && m[2]!.includes("`")) return null;
  return { marker: m[1]!, info: m[2]!.trim() };
}

export function fenceClose(line: string, marker: string): boolean {
  const trimmed = line.trim();
  if (line.length - line.replace(/^ */, "").length > 3) return false;
  return trimmed.startsWith(marker) && trimmed.replace(new RegExp(`^${marker[0] === "`" ? "`" : "~"}+$`), "") === "";
}

export interface Section {
  label: string;
  body: string;
}

function sectionLabel(line: string): string | null {
  if (line === "====") return "";
  return line.startsWith("==== ") ? line.slice(5).trim() : null;
}

export function splitSections(body: string): Section[] {
  const out: Section[] = [];
  let cur: string[] = [];
  let fence = "";
  const flush = () => {
    const last = out[out.length - 1];
    if (last) last.body = cur.join("\n").replace(/^\n+|\n+$/g, "");
    cur = [];
  };
  for (const line of body.split("\n")) {
    if (fence) {
      if (fenceClose(line, fence)) fence = "";
    } else {
      const label = sectionLabel(line);
      if (label !== null) {
        flush();
        out.push({ label, body: "" });
        continue;
      }
      const open = fenceOpen(line);
      if (open) fence = open.marker;
    }
    cur.push(line);
  }
  flush();
  return out;
}

export function joinSections(sections: Section[]): string {
  return sections
    .map((p) => {
      const label = p.label.replace(/\s+/g, " ").trim();
      const head = label ? `==== ${label}` : "====";
      return p.body ? `${head}\n${p.body}` : head;
    })
    .join("\n\n");
}
