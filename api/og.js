// api/og.js
//
// Renders a per-quote social preview image.
//
// The 570 SEO pages all shared one generic og.png, so posting any of them
// looked identical and gave no reason to click. This renders the actual quote
// at 1200x630, matching the in-app share card.
//
// Called as /api/og?id=<quote-uuid>. Passing the id rather than the text keeps
// the URL short and means the image can never drift from the database.
//
// Deliberately plain JS with React.createElement rather than TSX: an earlier
// attempt used a .tsx file and @vercel/og@1, which requires Node >= 22 while
// this project pins engines to <=20. That combination failed the Vercel build
// while building fine locally, because `npm run build:web` never touches api/.
// Pinned to @vercel/og@0.6.x (Node >= 16) and no JSX to compile.

import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://nmzjdcwjqutqdgqkmesy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_63wactDAvFIMgCvsQi4_1w_GxGSNGwR';

const BG = '#0C0A1A';
const BRAND = '#6672E7';
const BADGE = '#e63946';
const MUTED = '#C9CCE3';

const FALLBACK_IMAGE = 'https://quotes.wearesparklab.com/og.png';

/** Shrink long quotes so they still fit the card. */
function fontSizeFor(length) {
  if (length < 60) return 60;
  if (length < 110) return 50;
  if (length < 180) return 42;
  if (length < 260) return 34;
  return 28;
}

export default async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let text = 'One uplifting quote, every single day.';
    let author = 'Spark Quotes';
    let category = '';

    if (id) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/approved_quotes?select=text,author,category&id=eq.${encodeURIComponent(id)}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]) {
          text = rows[0].text || text;
          author = rows[0].author || author;
          category = rows[0].category || '';
        }
      }
    }

    const children = [];

    if (category) {
      children.push(
        h(
          'div',
          {
            key: 'badge',
            style: {
              display: 'flex',
              background: BADGE,
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '10px 26px',
              borderRadius: '999px',
              marginBottom: '34px',
            },
          },
          category.toUpperCase()
        )
      );
    }

    children.push(
      h(
        'div',
        {
          key: 'quote',
          style: {
            display: 'flex',
            color: '#FFFFFF',
            fontSize: fontSizeFor(text.length),
            fontStyle: 'italic',
            fontWeight: 600,
            lineHeight: 1.35,
            textAlign: 'center',
            maxWidth: '1000px',
          },
        },
        `“${text}”`
      )
    );

    children.push(
      h(
        'div',
        {
          key: 'author',
          style: { display: 'flex', color: MUTED, fontSize: 30, marginTop: '34px' },
        },
        `— ${author}`
      )
    );

    children.push(
      h(
        'div',
        {
          key: 'site',
          style: {
            display: 'flex',
            position: 'absolute',
            bottom: '48px',
            color: BRAND,
            fontSize: 24,
            fontWeight: 700,
          },
        },
        'quotes.wearesparklab.com'
      )
    );

    const card = h(
      'div',
      {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: BG,
          backgroundImage:
            'radial-gradient(circle at 50% 18%, rgba(102,114,231,0.38), rgba(12,10,26,0) 60%), radial-gradient(circle at 85% 95%, rgba(230,57,70,0.20), rgba(12,10,26,0) 55%)',
          padding: '70px',
        },
      },
      children
    );

    return new ImageResponse(card, {
      width: 1200,
      height: 630,
      headers: {
        // Quote text never changes once approved, so let the CDN keep it
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    });
  } catch (error) {
    console.error('OG image generation failed:', error);
    // Serve the static card rather than a broken image
    return Response.redirect(FALLBACK_IMAGE, 302);
  }
}
