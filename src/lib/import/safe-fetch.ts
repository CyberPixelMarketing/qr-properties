import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF-guarded fetch: http(s) only, every redirect hop re-checked,
 * hostnames resolving to private/loopback/link-local/metadata ranges are refused,
 * response size and time are capped.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 QRPropertiesImporter/1.0";

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

export class FetchBlockedError extends Error {}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchBlockedError("protocol");
  if (url.username || url.password) throw new FetchBlockedError("credentials");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new FetchBlockedError("host");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new FetchBlockedError("private");
}

export async function safeFetch(
  raw: string,
  { maxBytes = 3_000_000, timeoutMs = 12_000, accept = "text/html,application/xhtml+xml,*/*;q=0.8", maxHops = 5 } = {},
): Promise<{ url: string; status: number; contentType: string; body: Buffer }> {
  let url = new URL(raw);
  const deadline = AbortSignal.timeout(timeoutMs);
  for (let hop = 0; hop <= maxHops; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: deadline,
      headers: { "user-agent": UA, accept, "accept-language": "en,ar;q=0.8" },
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > maxBytes) throw new FetchBlockedError("too_large");
    const chunks: Buffer[] = [];
    let size = 0;
    const reader = res.body?.getReader();
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new FetchBlockedError("too_large");
        }
        chunks.push(Buffer.from(value));
      }
    }
    return { url: url.toString(), status: res.status, contentType: res.headers.get("content-type") ?? "", body: Buffer.concat(chunks) };
  }
  throw new FetchBlockedError("too_many_redirects");
}
