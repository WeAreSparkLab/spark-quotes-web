// components/studio/useStudioQuote.ts
//
// Loads the quote for the studio by id, from the database (falling back to
// the bundled set offline). Taking only an id means the words and the
// credit on the image always match what is stored, never a copy that could
// drift or be edited in the address bar.

import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../supabaseClient";
import { quotes as bundled, legacyCategoryMap, type Quote } from "../../data/data";

export function useStudioQuote() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const id = typeof q === "string" && /^[A-Za-z0-9-]{1,64}$/.test(q) ? q : null;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let live = true;
    (async () => {
      if (!id) { setState("missing"); return; }
      let found: Quote | null = null;
      try {
        const { data } = await supabase.schema("quotes").from("approved_quotes").select("id, text, author, category").eq("id", id).maybeSingle();
        if (data) found = data as Quote;
      } catch { /* offline */ }
      if (!found) {
        const b = bundled.find((x) => x.id === id);
        if (b) found = { ...b, category: legacyCategoryMap[b.category] ?? b.category };
      }
      if (!live) return;
      setQuote(found);
      setState(found ? "ready" : "missing");
    })();
    return () => { live = false; };
  }, [id]);

  return { quote, state };
}
