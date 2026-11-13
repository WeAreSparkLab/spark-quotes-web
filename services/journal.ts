// services/journal.ts — the Spark Journal
//
// Private entries in quotes.journal_entries. Row-level security means these
// calls can only ever reach the signed-in person's own rows; logged-out
// visitors have no access at all. Entries are never sent to any AI service.

import { supabase } from "../supabaseClient";

export type JournalKind = "reflection" | "intention";

export interface JournalEntry {
  id: string;
  kind: JournalKind;
  body: string;
  quote_id: string | null;
  quote_text: string | null;
  quote_author: string | null;
  entry_date: string; // YYYY-MM-DD, the writer's own calendar day
  created_at: string;
}

/** Today in the writer's own timezone (the database's "today" is UTC). */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const table = () => supabase.schema("quotes").from("journal_entries");

export async function listEntries(): Promise<JournalEntry[]> {
  const { data, error } = await table()
    .select("id, kind, body, quote_id, quote_text, quote_author, entry_date, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as JournalEntry[];
}

export async function addEntry(e: {
  kind: JournalKind;
  body: string;
  quote?: { id: string; text: string; author: string } | null;
  date?: string;
}): Promise<JournalEntry> {
  const body = e.body.trim().slice(0, 2000);
  if (!body) throw new Error("Nothing to save");
  const { data, error } = await table()
    .insert({
      kind: e.kind,
      body,
      quote_id: e.quote?.id ?? null,
      quote_text: e.quote?.text?.slice(0, 500) ?? null,
      quote_author: e.quote?.author?.slice(0, 120) ?? null,
      entry_date: e.date ?? localDate(),
    })
    .select("id, kind, body, quote_id, quote_text, quote_author, entry_date, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as JournalEntry;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw new Error(error.message);
}
