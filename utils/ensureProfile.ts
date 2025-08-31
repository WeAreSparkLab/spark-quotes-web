// utils/ensureProfile.ts
import { SupabaseClient } from '@supabase/supabase-js';

export async function ensureProfile(supabase: SupabaseClient, userId: string) {
  if (!userId) return;
  await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' });
}
