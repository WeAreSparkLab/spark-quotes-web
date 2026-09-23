import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PER_WINDOW = 5
const WINDOW_MINUTES = 10

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    // Acts as the calling user, so RLS applies to everything below.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    if (!body) return json({ error: 'Invalid request body' }, 400)

    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const author = typeof body.author === 'string' ? body.author.trim() : ''
    const category = typeof body.category === 'string' && body.category.trim()
      ? body.category.trim()
      : 'Uncategorized'

    if (text.length < 10) return json({ error: 'Quote must be at least 10 characters' }, 400)
    if (text.length > 500) return json({ error: 'Quote must be 500 characters or fewer' }, 400)
    if (author.length < 2) return json({ error: 'Author name is required' }, 400)
    if (author.length > 120) return json({ error: 'Author name is too long' }, 400)

    // Real rate limiting. The previous version counted rows in a table with
    // no created_at column, so the query always errored and the limit never
    // applied. quotes_for_review has created_at, and the qfr_select_own
    // policy lets a user count their own rows.
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .schema('quotes')
      .from('quotes_for_review')
      .select('id', { count: 'exact', head: true })
      .eq('submitted_by_user_id', user.id)
      .gte('created_at', since)

    if (countError) {
      console.error('Rate limit check failed:', countError)
      return json({ error: 'Could not verify submission limit. Please try again.' }, 503)
    }

    if ((count ?? 0) >= MAX_PER_WINDOW) {
      return json(
        { error: `Too many submissions. Please wait about ${WINDOW_MINUTES} minutes and try again.` },
        429
      )
    }

    // Goes into the moderation queue as pending. Nothing reaches the app
    // until approve_quote() copies it into approved_quotes.
    const { data, error } = await supabase
      .schema('quotes')
      .from('quotes_for_review')
      .insert({
        text,
        author,
        category,
        status: 'pending',
        submitted_by_user_id: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return json({ error: error.message }, 500)
    }

    // Notify the admin. Never let email trouble fail a saved submission.
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const adminEmail = Deno.env.get('ADMIN_EMAIL')

    if (resendApiKey && adminEmail) {
      try {
        const escape = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Spark Quotes <onboarding@resend.dev>',
            to: [adminEmail],
            subject: 'New quote awaiting review',
            html: `
              <h2>New quote submitted</h2>
              <p><strong>Quote:</strong> "${escape(text)}"</p>
              <p><strong>Author:</strong> ${escape(author)}</p>
              <p><strong>Category:</strong> ${escape(category)}</p>
              <p><strong>Submitted by:</strong> ${escape(user.email || user.id)}</p>
              <p><strong>Review id:</strong> ${data.id}</p>
              <hr>
              <p>Approve it by running this in the SQL editor:</p>
              <pre>select approve_quote('${data.id}');</pre>
              <p>Or reject it:</p>
              <pre>select reject_quote('${data.id}');</pre>
            `,
          }),
        })

        if (!res.ok) console.error('Failed to send email:', await res.text())
      } catch (emailError) {
        console.error('Email sending error:', emailError)
      }
    }

    return json({ success: true, id: data.id, status: 'pending' })
  } catch (error) {
    console.error('Function error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
