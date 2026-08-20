import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

export default async function handler(req, res) {
  // Vercel cron sends secret as query param OR uses authorization header
  // Vercel's native cron also sets a special header
  const secret = req.query.secret || req.headers['authorization']?.replace('Bearer ', '');
  const isVercelCron = req.headers['user-agent']?.includes('vercel-cron');
  
  if (!isVercelCron && secret !== CRON_SECRET) {
    console.log('Unauthorized - invalid CRON_SECRET and not Vercel cron');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Use service role key to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const currentUTCHour = now.getUTCHours();
    const currentTime = `${String(currentUTCHour).padStart(2, '0')}:00`;
    
    console.log(`[${now.toISOString()}] Checking at ${currentTime} UTC (hour ${currentUTCHour})`);
    
    // Fetch ALL enabled preferences with their timezones
    const { data: allPreferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, times, timezone')
      .eq('enabled', true);
    
    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      return res.status(500).json({ error: prefError.message });
    }
    
    console.log(`Found ${allPreferences?.length || 0} enabled users total`);
    
    if (!allPreferences || allPreferences.length === 0) {
      console.log('No enabled users');
      return res.status(200).json({ message: 'No enabled users', time: currentTime });
    }
    
    // Filter users who should receive notification at this UTC hour based on their timezone
    const usersToNotify = allPreferences.filter(pref => {
      if (!pref.timezone || !pref.times || pref.times.length === 0) {
        console.log(`User ${pref.user_id.substring(0, 8)} skipped: missing timezone or times`);
        return false;
      }
      
      try {
        // For each saved time (e.g., "09:00"), check if it matches current UTC hour in their timezone
        const shouldNotify = pref.times.some(localTime => {
          const [hours] = localTime.split(':').map(Number);
          
          // Get current time in user's timezone
          const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: pref.timezone }));
          const userLocalHour = userLocalTime.getHours();
          
          const matches = userLocalHour === hours;
          console.log(`User ${pref.user_id.substring(0, 8)}: timezone=${pref.timezone}, localHour=${userLocalHour}, wantedHours=${pref.times.join(',')}, checking ${hours}, matches=${matches}`);
          
          return matches;
        });
        
        return shouldNotify;
      } catch (e) {
        console.error(`Error processing timezone for user ${pref.user_id}:`, e);
        return false;
      }
    });
    
    if (usersToNotify.length === 0) {
      // Debug: show what times users ARE configured for
      const debugInfo = allPreferences.map(p => ({
        user_id: p.user_id.substring(0, 8),
        timezone: p.timezone,
        times: p.times,
        currentLocalHour: p.timezone ? new Date(now.toLocaleString('en-US', { timeZone: p.timezone })).getHours() : null
      }));
      
      console.log(`No users scheduled for this hour (${allPreferences.length} total enabled users)`);
      console.log('User schedules:', JSON.stringify(debugInfo, null, 2));
      
      return res.status(200).json({ 
        message: 'No users for this time', 
        time: currentTime,
        totalEnabled: allPreferences.length,
        userSchedules: debugInfo
      });
    }
    
    const userIds = usersToNotify.map(p => p.user_id);
    console.log(`Found ${usersToNotify.length} users to notify for hour ${currentUTCHour}:`, userIds.map(id => id.substring(0, 8)));
    
    // The notification deliberately does NOT contain a quote.
    //
    // It used to send a random one, but the app shows the quote of the day it
    // cached on that device — two unrelated picks, so the quote in the
    // notification was never the one you saw after tapping it. Teasing
    // instead keeps the two consistent and gives a reason to open the app.
    //
    // (To go the other way — put the quote back and have tapping open that
    // exact quote — the notification would need to carry its id and the app
    // would need to honour it.)
    const teasers = [
      'Today\'s quote is waiting for you.',
      'Your quote of the day is ready.',
      'Something worth reading is waiting.',
      'One good line, ready when you are.',
      'Your daily spark is here.',
    ];
    const quoteBody = teasers[Math.floor(Math.random() * teasers.length)];
    const quote = { text: quoteBody, author: 'Spark Quotes' };
    
    // Send to EVERY token a user has, so all their devices are notified.
    //
    // This used to keep only the most recent token per user, which meant
    // someone with a phone and a laptop was notified on exactly one of them —
    // whichever they opened last, since every app load refreshes that
    // device's token.
    //
    // Duplicates are prevented at the source instead: a token is unique to a
    // browser and registration is keyed on a device id, so one device can
    // only ever hold one token. The de-duplication below is a second line of
    // defence in case that ever drifts again.
    const { data: allTokens } = await supabase
      .from('fcm_tokens')
      .select('user_id, token, updated_at')
      .in('user_id', userIds)
      .order('updated_at', { ascending: false });

    // Belt and braces: never send the same token twice in one run. A token
    // identifies a browser, so a repeat here is a duplicate notification on
    // someone's screen — which is exactly what happened when the same token
    // was stored under more than one account.
    const seenTokens = new Set();
    const fcmTokens = [];
    for (const row of allTokens || []) {
      if (!row?.token || seenTokens.has(row.token)) continue;
      seenTokens.add(row.token);
      fcmTokens.push({ token: row.token, tokenUserId: row.user_id });
    }

    console.log(
      `Sending to ${fcmTokens.length} unique token(s) from ${(allTokens || []).length} row(s) across ${userIds.length} user(s)`
    );
    
    let sent = 0;
    const staleTokens = [];
    const logRows = [];
    console.log(`Found ${fcmTokens?.length || 0} FCM tokens for users:`, userIds.map(id => id.substring(0, 8)));
    
    if (fcmTokens && fcmTokens.length > 0 && FIREBASE_SERVICE_ACCOUNT) {
      // Support base64-encoded JSON to avoid escaping issues
      let serviceAccountJson = FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountJson.trim().startsWith('{')) {
        serviceAccountJson = Buffer.from(serviceAccountJson, 'base64').toString('utf8');
      }
      
      const serviceAccount = JSON.parse(serviceAccountJson);
      const accessToken = await getAccessToken(serviceAccount);
      const projectId = serviceAccount.project_id;
      
      for (const { token, tokenUserId } of fcmTokens) {
        const message = {
          message: {
            token,
            notification: {
              title: `✨ Spark Quotes`,
              body: quoteBody,
            },
            webpush: {
              notification: {
                icon: 'https://quotes.wearesparklab.com/icons/icon-192.png',
                badge: 'https://quotes.wearesparklab.com/icons/maskable-192.png',
                vibrate: [200, 100, 200],
                requireInteraction: false,
                // Shared tag: if anything ever displays this twice, the second
                // replaces the first instead of stacking.
                tag: 'spark-quotes-daily',
                data: {
                  url: 'https://quotes.wearesparklab.com/',
                  action: 'open-app'
                }
              },
              fcm_options: { link: 'https://quotes.wearesparklab.com' }
            },
          }
        };
        
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          }
        );
        
        if (response.ok) {
          sent++;
          console.log(`Sent to token ${token.substring(0, 20)}...`);
          logRows.push({
            user_id: tokenUserId,
            token_prefix: token.substring(0, 22),
            status: 'sent',
            quote_preview: quoteBody.substring(0, 80),
          });
        } else {
          const errorText = await response.text();
          console.error(`Failed: ${errorText}`);

          // FCM tells us when a token is dead — a browser that was
          // reinstalled, cleared, or rotated its token. Collect those and
          // remove them so the table stops growing stale entries forever.
          const isDeadToken =
            response.status === 404 ||
            errorText.includes('UNREGISTERED') ||
            errorText.includes('INVALID_ARGUMENT');

          if (isDeadToken) staleTokens.push(token);

          logRows.push({
            user_id: tokenUserId,
            token_prefix: token.substring(0, 22),
            status: 'failed',
            error: errorText.substring(0, 500),
            quote_preview: quoteBody.substring(0, 80),
          });
        }
      }

      // Record outcomes. Vercel's function logs are not reachable from
      // everywhere this gets debugged from, and "nothing arrived" is
      // impossible to diagnose without knowing what FCM actually said.
      if (logRows.length > 0) {
        const { error: logError } = await supabase.from('notification_log').insert(logRows);
        if (logError) console.error('Could not write notification log:', logError);
      }

      // Prune dead tokens so tomorrow's run is cleaner
      if (staleTokens.length > 0) {
        const { error: pruneError } = await supabase
          .from('fcm_tokens')
          .delete()
          .in('token', staleTokens);

        if (pruneError) {
          console.error('Could not prune stale tokens:', pruneError);
        } else {
          console.log(`Pruned ${staleTokens.length} dead token(s)`);
        }
      }
    } else if (!FIREBASE_SERVICE_ACCOUNT) {
      console.warn('FIREBASE_SERVICE_ACCOUNT not set!');
    }
    
    return res.status(200).json({
      success: true,
      time: currentTime,
      users: usersToNotify.length,
      sent,
      quote: `"${quote.text}" — ${quote.author}`
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getAccessToken(serviceAccount) {
  try {
    const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    
    const jwtClaimSetEncoded = Buffer.from(JSON.stringify(jwtClaimSet)).toString('base64url');
    const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
    
    // Use Node's native crypto for better compatibility
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    sign.end();
    const signature = sign.sign(serviceAccount.private_key);
    
    const signatureEncoded = signature.toString('base64url');
    const jwt = `${signatureInput}.${signatureEncoded}`;
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('OAuth token error:', data);
      throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Error in getAccessToken:', error.message, error.stack);
    throw error;
  }
}

function pemToArrayBuffer(pem) {
  // Handle both literal \n and actual newlines
  const normalizedPem = pem.replace(/\\n/g, '\n');
  
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  const binary = Buffer.from(base64, 'base64');
  return binary.buffer;
}
