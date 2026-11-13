// utils/shareLinks.ts
//
// Direct "share a link" buttons for the studio. These open each service's
// own share page in a new tab with the quote's public page as the link; that
// page carries a per-quote preview image (api/og), so it looks right in
// chats and feeds. They can't attach the studio image itself — only the
// device's share sheet can do that — so the studio offers both.

const SITE = "https://quotes.wearesparklab.com";

// Must match scripts/seo-pages.cjs, which builds the public pages.
function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** The quote's public page, or the home page for quotes that don't have one (offline bundle). */
export function quotePageUrl(q: { id: string; text: string }): string {
  if (!/^[0-9a-f-]{36}$/i.test(q.id)) return SITE + "/";
  const words = slugify(q.text).split("-").filter(Boolean).slice(0, 9).join("-");
  return `${SITE}/quote/${words || "quote"}-${q.id.slice(0, 8)}`;
}

export type LinkTarget = "whatsapp" | "facebook" | "x" | "pinterest";

export const LINK_TARGETS: { id: LinkTarget; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "pinterest", label: "Pinterest" },
];

export function shareLinkUrl(target: LinkTarget, q: { id: string; text: string; author: string }): string {
  const url = quotePageUrl(q);
  const credit = /^(anonymous|unknown)$/i.test(q.author.trim()) ? "" : ` — ${q.author.trim()}`;
  const line = `“${q.text.trim()}”${credit}`;
  const e = encodeURIComponent;
  switch (target) {
    case "whatsapp":
      return `https://wa.me/?text=${e(`${line}\n\n${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`;
    case "x":
      return `https://x.com/intent/post?text=${e(line)}&url=${e(url)}`;
    case "pinterest": {
      const media = /^[0-9a-f-]{36}$/i.test(q.id) ? `${SITE}/api/og?id=${q.id}` : `${SITE}/og.png`;
      return `https://pinterest.com/pin/create/button/?url=${e(url)}&media=${e(media)}&description=${e(line)}`;
    }
  }
}
