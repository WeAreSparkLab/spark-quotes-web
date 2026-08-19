// utils/analytics.ts
//
// Thin wrapper over whichever analytics/ad pixels are configured.
//
// Everything here is a no-op unless the matching env var is set, so the app
// ships with no third-party tracking by default. Before enabling a pixel for
// UK/EU traffic you need a lawful basis (usually consent) and the privacy
// policy needs to say what you're collecting.

export const PIXELS = {
  /** Meta (Facebook/Instagram) pixel ID, e.g. "1234567890" */
  META: process.env.EXPO_PUBLIC_META_PIXEL_ID || "",
  /** Google Ads / GA4 tag ID, e.g. "AW-123456789" or "G-XXXXXXX" */
  GOOGLE: process.env.EXPO_PUBLIC_GOOGLE_TAG_ID || "",
};

export const hasAnyPixel = () => !!(PIXELS.META || PIXELS.GOOGLE);

/**
 * Report a conversion-ish event to every configured destination.
 * Safe to call anywhere — silently does nothing if nothing is configured.
 */
export function trackEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  try {
    // Plausible is already on the page and needs no consent banner
    const plausible = (window as any).plausible;
    if (typeof plausible === "function") {
      plausible(name, { props: params });
    }

    const fbq = (window as any).fbq;
    if (typeof fbq === "function") {
      fbq("trackCustom", name, params);
    }

    const gtag = (window as any).gtag;
    if (typeof gtag === "function") {
      gtag("event", name, params);
    }
  } catch {
    // Analytics must never break the app
  }
}

/** Inline <script> body that boots whichever pixels are configured. */
export function pixelBootstrapScript(): string | null {
  const parts: string[] = [];

  if (PIXELS.META) {
    parts.push(`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXELS.META}');fbq('track','PageView');`);
  }

  if (PIXELS.GOOGLE) {
    parts.push(`
(function(){var s=document.createElement('script');s.async=true;
s.src='https://www.googletagmanager.com/gtag/js?id=${PIXELS.GOOGLE}';
document.head.appendChild(s);})();
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;gtag('js',new Date());gtag('config','${PIXELS.GOOGLE}');`);
  }

  return parts.length ? parts.join("\n") : null;
}
