// seedSupabase.js
// Run this script using Node.js: node --experimental-json-modules --loader ts-node/esm seedSupabase.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { quotes } = await import('./data/data.ts');

const rows = quotes
  .filter(q => q?.text && q?.author) 
  .map(q => ({
    text: q.text,
    author: q.author,
    category: q.category ?? 'General',
  }));

console.log(`Preparing to insert ${rows.length} quotes...`);

const { data, error } = await supabase
  .from('approved_quotes')
  .insert(rows)
  .select();

if (error) {
  console.error('Insert failed:', error);
  process.exit(1);
}

console.log(`Inserted ${data.length} quotes.`);

