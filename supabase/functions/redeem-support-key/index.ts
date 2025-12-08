import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { text, author, category } = await req.json()

    if (!text || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Quote must be at least 10 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!author || author.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Author name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limiting: count recent submissions (approximate using created_at)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count } = await supabaseClient
      .from('approved_quotes_staging')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', tenMinutesAgo)

    if (count && count >= 10) {
      return new Response(JSON.stringify({ error: 'Too many submissions recently. Please wait before submitting again.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabaseClient
      .from('approved_quotes_staging')
      .insert({
        text: text.trim(),
        author: author.trim(),
        category: category?.trim() || 'Uncategorized',
      })
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send email notification
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const adminEmail = Deno.env.get('ADMIN_EMAIL')

    if (resendApiKey && adminEmail) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Spark Quotes <onboarding@resend.dev>',
            to: [adminEmail],
            subject: 'New Quote Submission',
            html: `
              <h2>New Quote Submitted</h2>
              <p><strong>Quote:</strong> "${text.trim()}"</p>
              <p><strong>Author:</strong> ${author.trim()}</p>
              <p><strong>Category:</strong> ${category?.trim() || 'Uncategorized'}</p>
              <p><strong>Submitted by:</strong> ${user.email || user.id}</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            `,
          }),
        })

        const emailResult = await emailResponse.json()
        console.log('Email send result:', emailResult)

        if (!emailResponse.ok) {
          console.error('Failed to send email:', emailResult)
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError)
      }
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})