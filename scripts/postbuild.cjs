// scripts/postbuild.cjs
//
// Post-export fixups for the web build:
//   1. Stamp the service worker cache version.
//   2. Inject ad pixels into the static landing page.
//
// Both are inert-by-default and driven by env vars.

const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');

// ---------------------------------------------------------------------------
// 1. Service worker cache version
//
// sw.js is cache-first for .js and its cache name comes from CACHE_VERSION.
// That used to be bumped by hand, which got forgotten — leaving returning
// users pinned to an old bundle. Stamping it here means every deploy purges
// the previous caches.
// ---------------------------------------------------------------------------
function stampServiceWorker() {
  const swPath = path.join(dist, 'sw.js');
  if (!fs.existsSync(swPath)) {
    console.error('[postbuild] dist/sw.js not found — did the export run?');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const source = fs.readFileSync(swPath, 'utf8');
  const updated = source.replace(
    /const CACHE_VERSION = ['"][^'"]*['"];/,
    `const CACHE_VERSION = 'build-${stamp}';`
  );

  if (updated === source) {
    console.error('[postbuild] CACHE_VERSION line not found — SW caching may go stale');
    process.exit(1);
  }

  fs.writeFileSync(swPath, updated);
  console.log(`[postbuild] CACHE_VERSION set to build-${stamp}`);
}

// ---------------------------------------------------------------------------
// 2. Ad pixels on the landing page
//
// start.html is plain static HTML, so it never runs the React app's pixel
// bootstrap. Ads point at /start, which is precisely where the pixel needs to
// fire, so inject the same snippets here at build time.
//
// Nothing is injected unless the env vars are set.
// ---------------------------------------------------------------------------
function injectPixels() {
  const metaId = process.env.EXPO_PUBLIC_META_PIXEL_ID || '';
  const googleId = process.env.EXPO_PUBLIC_GOOGLE_TAG_ID || '';

  if (!metaId && !googleId) {
    console.log('[postbuild] no pixel env vars set — landing page left clean');
    return;
  }

  const startPath = path.join(dist, 'start.html');
  if (!fs.existsSync(startPath)) {
    console.error('[postbuild] dist/start.html not found');
    process.exit(1);
  }

  const parts = [];

  if (metaId) {
    parts.push(`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${metaId}');fbq('track','PageView');`);
  }

  if (googleId) {
    parts.push(`(function(){var s=document.createElement('script');s.async=true;
s.src='https://www.googletagmanager.com/gtag/js?id=${googleId}';
document.head.appendChild(s);})();
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;gtag('js',new Date());gtag('config','${googleId}');`);
  }

  const snippet = `<script>\n${parts.join('\n')}\n</script>\n</head>`;
  const html = fs.readFileSync(startPath, 'utf8');

  if (!html.includes('</head>')) {
    console.error('[postbuild] start.html has no </head> to inject into');
    process.exit(1);
  }

  fs.writeFileSync(startPath, html.replace('</head>', snippet));
  console.log(
    `[postbuild] injected pixels into start.html (meta=${!!metaId}, google=${!!googleId})`
  );
}

// ---------------------------------------------------------------------------
// 3. Homepage structured data.
//
// expo-router/head renders <meta> and <link> but drops
// <script type="application/ld+json">, so the WebSite markup declared in
// _layout never reached the served HTML. Inject it here instead, where it
// actually lands.
// ---------------------------------------------------------------------------
function injectHomepageJsonLd() {
  const indexPath = path.join(dist, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('[postbuild] dist/index.html not found');
    process.exit(1);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes('application/ld+json')) {
    console.log('[postbuild] homepage already has JSON-LD, leaving it alone');
    return;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Spark Quotes',
    url: 'https://quotes.wearesparklab.com/',
    description:
      'One uplifting quote every time you open it. Pick your topics, save your favourites, and share the ones that land.',
    publisher: { '@type': 'Organization', name: 'We Are SparkLab' },
  };

  const tag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`;
  fs.writeFileSync(indexPath, html.replace('</head>', tag));
  console.log('[postbuild] injected homepage JSON-LD (WebSite)');
}

// ---------------------------------------------------------------------------
// 4. Crawlable pages for every quote (and the sitemap covering them).
// ---------------------------------------------------------------------------
const { generate: generateSeoPages } = require('./seo-pages.cjs');

(async () => {
  stampServiceWorker();
  injectPixels();
  injectHomepageJsonLd();
  await generateSeoPages();
})();
