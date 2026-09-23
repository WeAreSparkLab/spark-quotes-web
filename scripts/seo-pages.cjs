// scripts/seo-pages.cjs
//
// Generates static, crawlable pages for every approved quote.
//
// Why static HTML rather than app routes: the Expo export renders the app
// shell, so `/` ships "Initializing app..." in its HTML and the quote itself
// only appears after JS boots and Supabase responds. Crawlers need the text
// in the response body, so these are plain pages built from the database at
// deploy time.
//
// Structure (internal linking matters — orphan pages get crawled poorly):
//   /quotes                  index of every category
//   /quotes/<category>       every quote in that category
//   /quote/<slug>            one quote, plus related ones
//
// Output goes to dist/ and is never committed; it is rebuilt each deploy so
// it always matches the live data.

const fs = require('fs');
const path = require('path');

const SITE = 'https://quotes.wearesparklab.com';
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zckbrbqxnibzmuesqsok.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_-NEaU78G8mtqCRFc-9WEFg_aHA5OsIn';

const dist = path.join(__dirname, '..', 'dist');

// --- helpers ---------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Readable slug, with a short id suffix so near-identical quotes stay unique. */
function quoteSlug(quote) {
  const words = slugify(quote.text).split('-').filter(Boolean).slice(0, 9).join('-');
  return `${words || 'quote'}-${quote.id.slice(0, 8)}`;
}

function truncate(s, n) {
  const t = String(s).trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

const CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#0C0A1A;color:#fff;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.glow{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(60ch 40ch at 50% 8%,rgba(102,114,231,.28),transparent 70%),radial-gradient(50ch 34ch at 88% 95%,rgba(230,57,70,.14),transparent 70%)}
.wrap{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:0 20px 64px}
header{padding:28px 0 8px}
.brand{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:800;letter-spacing:-.01em}
nav.crumbs{color:#8E94AD;font-size:14px;margin:18px 0 0}
nav.crumbs a{color:#BFC4D6}
h1{font-size:clamp(24px,4.6vw,36px);line-height:1.2;letter-spacing:-.02em;margin:18px 0 0;font-weight:800}
.card{border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(255,255,255,.035);padding:32px 26px;margin:26px 0 0;text-align:center}
.badge{display:inline-block;background:#e63946;color:#fff;font-size:11px;font-weight:800;letter-spacing:.09em;padding:6px 14px;border-radius:999px;text-transform:uppercase;text-decoration:none}
blockquote{margin:20px 0 0;font-size:clamp(20px,3.6vw,27px);font-style:italic;font-weight:600;line-height:1.4}
.author{color:#BFC4D6;margin-top:14px;font-size:15px}
.cta{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:26px 0 0}
.btn{display:inline-block;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:12px;font-size:16px}
.btn-primary{background:#6672E7;color:#fff;box-shadow:0 6px 22px rgba(102,114,231,.4)}
.btn-ghost{border:1px solid rgba(255,255,255,.18);color:#fff}
h2{font-size:19px;margin:42px 0 14px;font-weight:700}
ul.list{list-style:none;padding:0;margin:0;display:grid;gap:10px}
ul.list a{display:block;padding:14px 16px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.025);color:#E6E7F2;text-decoration:none}
ul.list a:hover{background:rgba(255,255,255,.06)}
ul.list .m{display:block;color:#8E94AD;font-size:13px;margin-top:4px}
.tags{display:flex;flex-wrap:wrap;gap:9px;margin:0;padding:0;list-style:none}
.tags a{display:inline-block;padding:9px 15px;border:1px solid rgba(255,255,255,.14);border-radius:999px;color:#E6E7F2;text-decoration:none;font-size:14px}
.tags a:hover{background:rgba(255,255,255,.06)}
footer{margin:56px 0 0;padding:24px 0 0;border-top:1px solid rgba(255,255,255,.12);color:#8E94AD;font-size:14px;text-align:center}
footer a{color:#BFC4D6}
`.trim();

function page({ title, description, canonical, jsonLd, body, image }) {
  const ogImage = image || `${SITE}/og.png`;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0C0A1A">
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Spark Quotes">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
<script defer data-domain="quotes.wearesparklab.com" src="https://plausible.io/js/script.js"></script>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${CSS}</style>
</head>
<body>
<div class="glow"></div>
<div class="wrap">
<header><a class="brand" href="/">✨ Spark Quotes</a></header>
${body}
<footer>
  <p><a href="/">Open the app</a> · <a href="/quotes">All topics</a> · <a href="/privacy">Privacy</a><br>
  Made by SparkLab, a small family business in the UK.</p>
</footer>
</div>
</body>
</html>
`;
}

function crumbs(parts) {
  return `<nav class="crumbs">${parts
    .map((p) => (p.href ? `<a href="${p.href}">${escapeHtml(p.label)}</a>` : escapeHtml(p.label)))
    .join(' › ')}</nav>`;
}

function breadcrumbLd(parts) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: parts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.label,
      ...(p.href ? { item: SITE + p.href } : {}),
    })),
  };
}

// --- data ------------------------------------------------------------------

async function fetchAllQuotes() {
  const pageSize = 1000;
  let from = 0;
  const all = [];

  for (;;) {
    const url =
      `${SUPABASE_URL}/rest/v1/approved_quotes` +
      `?select=id,text,author,category&order=id.asc` +
      `&offset=${from}&limit=${pageSize}`;

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Accept-Profile': 'quotes',
      },
    });

    if (!res.ok) {
      throw new Error(`Supabase returned ${res.status}: ${await res.text()}`);
    }

    const batch = await res.json();
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return all.filter((q) => q && q.text && q.author);
}

// --- page builders ---------------------------------------------------------

function quotePage(quote, related) {
  const canonical = `${SITE}/quote/${quoteSlug(quote)}`;
  const catSlug = slugify(quote.category || 'uncategorized');
  const shortText = truncate(quote.text, 60);

  const path = [
    { label: 'Home', href: '/' },
    { label: 'Quotes', href: '/quotes' },
    { label: quote.category || 'Quotes', href: `/quotes/${catSlug}` },
    { label: shortText },
  ];

  const body = `
${crumbs(path)}
<div class="card">
  <a class="badge" href="/quotes/${catSlug}">${escapeHtml(quote.category || 'Quotes')}</a>
  <blockquote>&ldquo;${escapeHtml(quote.text)}&rdquo;</blockquote>
  <p class="author">— ${escapeHtml(quote.author)}</p>
  <div class="cta">
    <a class="btn btn-primary" href="/">Get a quote like this every day</a>
  </div>
</div>
${
  related.length
    ? `<h2>More ${escapeHtml(quote.category || 'quotes')} quotes</h2>
<ul class="list">
${related
  .map(
    (r) =>
      `  <li><a href="/quote/${quoteSlug(r)}">&ldquo;${escapeHtml(
        truncate(r.text, 110)
      )}&rdquo;<span class="m">— ${escapeHtml(r.author)}</span></a></li>`
  )
  .join('\n')}
</ul>`
    : ''
}
<div class="cta" style="margin-top:34px">
  <a class="btn btn-ghost" href="/quotes/${catSlug}">All ${escapeHtml(
    quote.category || 'quotes'
  )} quotes</a>
</div>`;

  return page({
    image: `${SITE}/api/og?id=${quote.id}`,
    title: `"${truncate(quote.text, 70)}" — ${quote.author}`,
    description: `${truncate(quote.text, 150)} — ${quote.author}. A ${
      quote.category || 'daily'
    } quote from Spark Quotes.`,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Quotation',
          text: quote.text,
          creator: { '@type': 'Person', name: quote.author },
          isPartOf: { '@type': 'WebSite', name: 'Spark Quotes', url: `${SITE}/` },
          url: canonical,
        },
        breadcrumbLd(path),
      ],
    },
    body,
  });
}

function categoryPage(category, quotes) {
  const catSlug = slugify(category);
  const canonical = `${SITE}/quotes/${catSlug}`;
  const path = [
    { label: 'Home', href: '/' },
    { label: 'Quotes', href: '/quotes' },
    { label: category },
  ];

  const body = `
${crumbs(path)}
<h1>${escapeHtml(category)} quotes</h1>
<p style="color:#BFC4D6">${quotes.length} hand-picked ${escapeHtml(
    category.toLowerCase()
  )} quotes. Pick this topic in the app to get one each day.</p>
<div class="cta" style="justify-content:flex-start">
  <a class="btn btn-primary" href="/">Open Spark Quotes</a>
</div>
<h2>All ${escapeHtml(category.toLowerCase())} quotes</h2>
<ul class="list">
${quotes
  .map(
    (q) =>
      `  <li><a href="/quote/${quoteSlug(q)}">&ldquo;${escapeHtml(
        truncate(q.text, 130)
      )}&rdquo;<span class="m">— ${escapeHtml(q.author)}</span></a></li>`
  )
  .join('\n')}
</ul>`;

  return page({
    title: `${category} Quotes — ${quotes.length} to lift your day | Spark Quotes`,
    description: `${quotes.length} hand-picked ${category.toLowerCase()} quotes. Read them all, save your favourites, and get one delivered each day.`,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: `${category} Quotes`,
          url: canonical,
          isPartOf: { '@type': 'WebSite', name: 'Spark Quotes', url: `${SITE}/` },
        },
        breadcrumbLd(path),
      ],
    },
    body,
  });
}

function indexPage(byCategory, total) {
  const canonical = `${SITE}/quotes`;
  const path = [{ label: 'Home', href: '/' }, { label: 'Quotes' }];
  const cats = [...byCategory.keys()].sort();

  const body = `
${crumbs(path)}
<h1>All quotes by topic</h1>
<p style="color:#BFC4D6">${total} hand-picked quotes across ${cats.length} topics. Choose the ones you care about and get a quote each day.</p>
<div class="cta" style="justify-content:flex-start">
  <a class="btn btn-primary" href="/">Open Spark Quotes</a>
</div>
<h2>Topics</h2>
<ul class="tags">
${cats
  .map(
    (c) =>
      `  <li><a href="/quotes/${slugify(c)}">${escapeHtml(c)} (${
        byCategory.get(c).length
      })</a></li>`
  )
  .join('\n')}
</ul>`;

  return page({
    title: `All Quotes by Topic — ${total} quotes | Spark Quotes`,
    description: `Browse ${total} hand-picked quotes across ${cats.length} topics — from funny and love to focus and resilience.`,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'All Quotes by Topic',
          url: canonical,
          isPartOf: { '@type': 'WebSite', name: 'Spark Quotes', url: `${SITE}/` },
        },
        breadcrumbLd(path),
      ],
    },
    body,
  });
}

// --- main ------------------------------------------------------------------

async function generate() {
  let quotes;
  try {
    quotes = await fetchAllQuotes();
  } catch (err) {
    // A deploy should not fail because the database was briefly unreachable.
    console.error(`[seo] could not fetch quotes, skipping SEO pages: ${err.message}`);
    return;
  }

  if (!quotes.length) {
    console.error('[seo] no quotes returned, skipping SEO pages');
    return;
  }

  const byCategory = new Map();
  for (const q of quotes) {
    const c = q.category || 'Uncategorized';
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c).push(q);
  }

  fs.mkdirSync(path.join(dist, 'quote'), { recursive: true });
  fs.mkdirSync(path.join(dist, 'quotes'), { recursive: true });

  const urls = [`${SITE}/`, `${SITE}/start`, `${SITE}/quotes`];

  // Individual quote pages
  const seen = new Set();
  for (const q of quotes) {
    const slug = quoteSlug(q);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const siblings = byCategory.get(q.category || 'Uncategorized') || [];
    const related = siblings.filter((r) => r.id !== q.id).slice(0, 6);

    fs.writeFileSync(path.join(dist, 'quote', `${slug}.html`), quotePage(q, related));
    urls.push(`${SITE}/quote/${slug}`);
  }

  // Category pages
  for (const [category, list] of byCategory) {
    const slug = slugify(category);
    fs.writeFileSync(path.join(dist, 'quotes', `${slug}.html`), categoryPage(category, list));
    urls.push(`${SITE}/quotes/${slug}`);
  }

  // Index
  fs.writeFileSync(path.join(dist, 'quotes.html'), indexPage(byCategory, quotes.length));

  // Sitemap covering everything, replacing the hand-written stub
  urls.push(
    `${SITE}/topics`,
    `${SITE}/favorites`,
    `${SITE}/submitQuote`,
    `${SITE}/settings`,
    `${SITE}/privacy`
  );
  fs.writeFileSync(path.join(dist, 'sitemap.txt'), `${[...new Set(urls)].join('\n')}\n`);

  console.log(
    `[seo] ${seen.size} quote pages, ${byCategory.size} category pages, sitemap with ${
      new Set(urls).size
    } URLs`
  );
}

module.exports = { generate, slugify, quoteSlug };
