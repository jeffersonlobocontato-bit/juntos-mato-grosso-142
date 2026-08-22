import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function chunkText(text: string, maxChunkSize = 1500, overlap = 200): string[] {
  if (!text || text.length === 0) return [];
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    if (end < text.length) {
      // Try to break at paragraph, then sentence, then word boundary
      const segment = text.substring(start, end + 100);
      const paraBreak = segment.lastIndexOf('\n\n', maxChunkSize);
      const sentenceBreak = segment.lastIndexOf('. ', maxChunkSize);
      const wordBreak = segment.lastIndexOf(' ', maxChunkSize);
      
      if (paraBreak > maxChunkSize * 0.5) {
        end = start + paraBreak + 2;
      } else if (sentenceBreak > maxChunkSize * 0.5) {
        end = start + sentenceBreak + 2;
      } else if (wordBreak > maxChunkSize * 0.5) {
        end = start + wordBreak + 1;
      }
    } else {
      end = text.length;
    }
    
    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
    if (start >= text.length) break;
  }
  
  return chunks.filter(c => c.length > 20);
}

// Lightweight embeddings endpoint (no LLM round-trip = far less memory/CPU)
async function embedBatch(texts: string[], apiKey: string): Promise<(number[] | null)[]> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/text-embedding-004",
        input: texts.map((t) => t.substring(0, 2000)),
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status, await response.text());
      return texts.map(() => null);
    }

    const data = await response.json();
    return texts.map((_, i) => {
      const v = data?.data?.[i]?.embedding;
      return Array.isArray(v) ? v : null;
    });
  } catch (e) {
    console.error("Embedding generation error:", e);
    return texts.map(() => null);
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await authClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = (roles || []).some((r: any) => ["admin", "admin_master"].includes(r.role));
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const document_id = body?.document_id;
    const startIndex: number = Number(body?.start_index) || 0;
    const BATCH = 20; // chunks per invocation — keeps memory/CPU under the worker limit


    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "document_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch document content
    const { data: doc, error: docError } = await supabase
      .from("ai_documents")
      .select("id, content, title")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing chunks only on the first pass
    if (startIndex === 0) {
      await supabase.from("ai_document_chunks").delete().eq("document_id", document_id);
    }

    // Chunk the content
    const chunks = chunkText(`${doc.title}\n\n${doc.content}`);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No content to chunk", chunks_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slice = chunks.slice(startIndex, startIndex + BATCH);
    const embeddings = await embedBatch(slice, LOVABLE_API_KEY);

    const rows = slice.map((content, k) => {
      const emb = embeddings[k];
      return {
        document_id,
        chunk_index: startIndex + k,
        content,
        metadata: { title: doc.title, total_chunks: chunks.length },
        ...(emb ? { embedding: JSON.stringify(emb) } : {}),
      };
    });

    const { error: insertError } = await supabase.from("ai_document_chunks").insert(rows);
    if (insertError) console.error("Error inserting chunks:", insertError);

    const nextIndex = startIndex + slice.length;
    const done = nextIndex >= chunks.length;

    // Chain the next batch in the background so each worker stays well under its limits
    if (!done) {
      const chain = fetch(`${supabaseUrl}/functions/v1/process-document-chunks`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ document_id, start_index: nextIndex }),
      }).catch((e) => console.error("Chain error:", e));
      // @ts-ignore EdgeRuntime is available in Supabase edge functions
      if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(chain);
      else await chain;
    }

    return new Response(
      JSON.stringify({
        message: done ? "Document processed" : "Batch processed, continuing",
        done,
        processed: nextIndex,
        total_chunks: chunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("process-document-chunks error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
