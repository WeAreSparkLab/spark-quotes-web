import { createClient } from '@supabase/supabase-js';

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
    
    const { data: quotes } = await supabase.from('quotes').select('quote,author').limit(1);
    const quote = quotes?.[0] || { quote: 'Daily inspiration!', author: 'Spark Quotes' };
    
    const { data: fcmTokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .in('user_id', userIds);
    
    let sent = 0;
    console.log(`Found ${fcmTokens?.length || 0} FCM tokens for users:`, userIds.map(id => id.substring(0, 8)));
    
    if (fcmTokens && fcmTokens.length > 0 && FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
      const accessToken = await getAccessToken(serviceAccount);
      const projectId = serviceAccount.project_id;
      
      for (const { token } of fcmTokens) {
        const message = {
          message: {
            token,
            notification: {
              title: '✨ Your Daily Quote is Ready',
              body: 'Tap to discover today\'s inspiration',
            },
            webpush: {
              notification: {
                icon: 'https://quotes.wearesparklab.com/icons/icon-192.png',
                badge: 'https://quotes.wearesparklab.com/icons/maskable-192.png',
                vibrate: [200, 100, 200],
                requireInteraction: false,
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
        } else {
          console.error(`Failed: ${await response.text()}`);
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
      quote: `"${quote.quote}" — ${quote.author}`
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
    
    const privateKeyBuffer = pemToArrayBuffer(serviceAccount.private_key);
    console.log('Private key buffer length:', privateKeyBuffer.byteLength);
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signatureInput)
    );
    
    const signatureEncoded = Buffer.from(signature).toString('base64url');
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
