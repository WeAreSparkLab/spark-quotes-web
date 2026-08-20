import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

// Helper to get FCM access token
async function getAccessToken(serviceAccount) {
  const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const jwtClaimSetEncoded = Buffer.from(JSON.stringify(jwtClaimSet)).toString('base64url');
  const signatureInput = `${jwtHeader}.${jwtClaimSetEncoded}`;
  
  // Use Node's native crypto instead of Web Crypto API for better compatibility
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();
  const signature = sign.sign(serviceAccount.private_key);
  
  const jwtSignature = signature.toString('base64url');
  const jwt = `${signatureInput}.${jwtSignature}`;
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  console.log('Extracted base64 length:', base64.length);
  console.log('Base64 first 50 chars:', base64.substring(0, 50));
  console.log('Base64 last 50 chars:', base64.substring(base64.length - 50));
  
  const binary = Buffer.from(base64, 'base64');
  console.log('Binary buffer length:', binary.length);
  return binary.buffer;
}

export default async function handler(req, res) {
  // Allow testing from browser or authenticated requests
  // This endpoint sends real push notifications, so it must not be open to
  // anyone who guesses a user id. CRON_SECRET is already set in Vercel.
  const secret = req.query.secret || req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.query.user_id || req.body?.user_id;
  
  if (!userId) {
    return res.status(400).json({ error: 'user_id required as query parameter' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get a random quote
    // Mirrors the real cron: a teaser, not a quote, so the notification and
    // the app can never disagree about which quote is today's.
    const quote = { text: "Today’s quote is waiting for you.", author: "Spark Quotes" };
    
    // Every device, so we can see exactly which tokens are dead
    const { data: allTokens } = await supabase
      .from('fcm_tokens')
      .select('token, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    
    const fcmTokens = allTokens || [];
    
    console.log(`Testing notification for user ${userId}`);
    console.log(`Found ${fcmTokens.length} FCM token (most recent)`);
    
    if (!fcmTokens || fcmTokens.length === 0) {
      return res.status(200).json({ 
        message: 'No FCM tokens found for user',
        userId,
        hint: 'Make sure notifications are enabled in settings'
      });
    }
    
    if (!FIREBASE_SERVICE_ACCOUNT) {
      return res.status(500).json({ error: 'Firebase service account not configured' });
    }
    
    // Support base64-encoded JSON to avoid escaping issues
    let serviceAccountJson = FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson.trim().startsWith('{')) {
      serviceAccountJson = Buffer.from(serviceAccountJson, 'base64').toString('utf8');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    
    let sent = 0;
    const results = [];
    
    for (const { token } of fcmTokens) {
      const message = {
        message: {
          token,
          notification: {
            title: `✨ Spark Quotes`,
            body: quote.text,
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
      
      try {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
          }
        );
        
        const result = await response.json();
        
        if (response.ok) {
          sent++;
          results.push({ status: 'sent', token: token.substring(0, 20) + '...' });
          console.log('Notification sent successfully');
        } else {
          results.push({ status: 'failed', token: token.substring(0, 20) + '...', error: result });
          console.error('Failed to send notification:', result);
        }
      } catch (error) {
        results.push({ status: 'error', token: token.substring(0, 20) + '...', error: error.message });
        console.error('Error sending notification:', error);
      }
    }
    
    return res.status(200).json({
      message: `Test notification sent`,
      userId,
      sent,
      total: fcmTokens.length,
      results
    });
    
  } catch (error) {
    console.error('Error in test notification:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
