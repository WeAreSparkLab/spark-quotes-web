import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const now = new Date();
    const currentUTCHour = now.getUTCHours();
    
    // Fetch ALL notification preferences
    const { data: prefs, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*');
    
    if (prefError) {
      return res.status(500).json({ error: prefError.message });
    }
    
    // Fetch ALL FCM tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('*');
    
    if (tokenError) {
      return res.status(500).json({ error: tokenError.message });
    }
    
    // Calculate which users should get notifications now
    const usersForCurrentHour = prefs?.filter(pref => {
      if (!pref.enabled || !pref.timezone || !pref.times) return false;
      
      try {
        return pref.times.some(localTime => {
          const [hours] = localTime.split(':').map(Number);
          const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: pref.timezone }));
          const userLocalHour = userLocalTime.getHours();
          return userLocalHour === hours;
        });
      } catch (e) {
        return false;
      }
    }) || [];
    
    return res.status(200).json({
      currentUTCHour,
      currentUTCTime: now.toISOString(),
      totalPreferences: prefs?.length || 0,
      totalTokens: tokens?.length || 0,
      preferences: prefs || [],
      tokens: tokens || [],
      usersScheduledNow: usersForCurrentHour.length,
      scheduledUsers: usersForCurrentHour
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
