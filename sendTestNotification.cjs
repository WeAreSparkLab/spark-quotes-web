const https = require('https');

const APP_ID = 'b04c3e41-0909-471e-8c99-b4ce6b83466a';
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
if (!REST_API_KEY) {
  console.error('Error: ONESIGNAL_REST_API_KEY environment variable not set');
  process.exit(1);
}

// Parse command line arguments
let recipientId = null;
let isExternalId = false;
let sendToAll = false;

if (process.argv.includes('--all')) {
  sendToAll = true;
} else if (process.argv.includes('--external-id')) {
  const idx = process.argv.indexOf('--external-id');
  recipientId = process.argv[idx + 1];
  isExternalId = true;
} else {
  // Legacy: treat second argument as player ID
  recipientId = process.argv[2];
}

if (!recipientId && !sendToAll) {
  console.error('Usage: node sendTestNotification.cjs <playerId>');
  console.error('   or: node sendTestNotification.cjs --external-id <supabaseUserId>');
  console.error('   or: node sendTestNotification.cjs --all');
  process.exit(1);
}

// Build request data based on recipient type
const requestBody = {
  app_id: APP_ID,
  contents: { en: 'Test notification from Spark Quotes!' },
  headings: { en: 'Test Notification' }
};

if (sendToAll) {
  requestBody.included_segments = ['Subscribed Users'];
} else if (isExternalId) {
  requestBody.include_external_user_ids = [recipientId];
} else {
  requestBody.include_player_ids = [recipientId];
}

const data = JSON.stringify(requestBody);
const recipientType = sendToAll ? 'all subscribed users' : (isExternalId ? 'external user ID' : 'player ID');
const recipientValue = sendToAll ? '' : `: ${recipientId}`;
console.log(`Sending test notification to ${recipientType}${recipientValue}`);

const options = {
  hostname: 'onesignal.com',
  port: 443,
  path: '/api/v1/notifications',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Basic ${REST_API_KEY}`,
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
};
const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(' Notification sent successfully!');
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } else {
        console.error(' Error sending notification');
        console.error(`Status: ${res.statusCode}`);
        console.error('Response:', JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.error(' Error parsing response:', responseData);
    }
  });
});
req.on('error', (e) => {
  console.error(` Request error: ${e.message}`);
  process.exit(1);
});
req.write(data);
req.end();
