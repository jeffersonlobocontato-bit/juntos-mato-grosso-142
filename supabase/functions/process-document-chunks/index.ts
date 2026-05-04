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

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are an embedding generator. Given the input text, output ONLY a JSON array of exactly 768 floating point numbers representing a semantic embedding vector. No other text.",
          },
          { role: "user", content: `Generate a 768-dimensional embedding vector for: ${text.substring(0, 2000)}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Try to parse the JSON array from the response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return null;
    
    const embedding = JSON.parse(match[0]);
    if (Array.isArray(embedding) && embedding.length === 768) {
      return embedding;
    }
    return null;
  } catch (e) {
    console.error("Embedding generation error:", e);
    return null;
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

    const { document_id } = await req.json();

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

    // Delete existing chunks for this document
    await supabase
      .from("ai_document_chunks")
      .delete()
      .eq("document_id", document_id);

    // Chunk the content
    const fullText = `${doc.title}\n\n${doc.content}`;
    const chunks = chunkText(fullText);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No content to chunk", chunks_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate embeddings and insert chunks
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i], LOVABLE_API_KEY);
      
      const insertData: any = {
        document_id,
        chunk_index: i,
        content: chunks[i],
        metadata: { title: doc.title, total_chunks: chunks.length },
      };

      if (embedding) {
        insertData.embedding = JSON.stringify(embedding);
      }

      const { error: insertError } = await supabase
        .from("ai_document_chunks")
        .insert(insertData);

      if (!insertError) successCount++;
      else console.error(`Error inserting chunk ${i}:`, insertError);

      // Small delay to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return new Response(
      JSON.stringify({
        message: "Document processed",
        chunks_created: successCount,
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
