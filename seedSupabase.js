// seedSupabase.js
// Run this script using Node.js: node --experimental-json-modules --loader ts-node/esm seedSupabase.js

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your ACTUAL Supabase Project URL and Service Role Key
// You can find these in your Supabase dashboard: Settings -> API
const SUPABASE_URL = 'https://nmzjdcwjqutqdgqkmesy.supabase.co'; 
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tempkY3dqcXV0cWRncWttZXN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM2MDcyNywiZXhwIjoyMDY1OTM2NzI3fQ.SuugKgKeBd4BjdTmAlEAGTlBrV8n1ixUXjqzs1kSMEI';

// --- DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU'RE DOING ---

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define the structure of your Quote, matching your app/data.ts
// Use dynamic import for ESM compatibility with TypeScript files
const { quotes: localQuotes } = await import('./app/data.ts');


async function seedApprovedQuotesTable() {
    console.log("Starting Supabase seeding process...");

    // Filter out quotes that might not have a category if your DB schema requires it
    // For this script, we'll assume all quotes have a category for the DB
    const quotesToInsert = localQuotes.map(quote => ({
        text: quote.text,
        author: quote.author,
        category: quote.category,
    }));

    try {
        // First, let's clear the table to prevent duplicate inserts on re-runs
        // (OPTIONAL - REMOVE THIS LINE IF YOU WANT TO ADD WITHOUT DELETING EXISTING)
        const { error: deleteError } = await supabase.from('approved_quotes').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all but a dummy ID if any, or just all records
        if (deleteError) {
            console.error("Error clearing existing quotes (might be ok if table was empty):", deleteError.message);
            // Continue even if delete fails, unless it's critical
        } else {
            console.log("Cleared existing quotes from 'approved_quotes' table (if any).");
        }


        console.log(`Attempting to insert ${quotesToInsert.length} quotes into 'approved_quotes'...`);
        const { data, error } = await supabase
            .from('approved_quotes')
            .insert(quotesToInsert)
            .select(); // Use .select() to get the inserted data back

        if (error) {
            console.error("Error inserting quotes:", error);
        } else {
            console.log(`Successfully inserted ${data.length} quotes into 'approved_quotes'.`);
            console.log("First few inserted quotes:", data.slice(0, 5)); // Log first 5 for verification
        }

    } catch (e) {
        console.error("An unexpected error occurred during seeding:", e);
    } finally {
        console.log("Supabase seeding process finished.");
    }
}

seedApprovedQuotesTable();
