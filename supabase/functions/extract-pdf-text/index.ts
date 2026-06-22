import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1';

const MAX_CHARS = 8000;
const MAX_PAGES = 50;
const FETCH_TIMEOUT_MS = 25000;

interface Body {
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;
    const url = body?.url;
    if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      return new Response(JSON.stringify({ error: 'invalid url' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let buf: ArrayBuffer;
    try {
      const r = await fetch(url, { signal: controller.signal });
      if (!r.ok) {
        return new Response(
          JSON.stringify({ error: `fetch failed: ${r.status}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      buf = await r.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }

    const bytes = new Uint8Array(buf);
    const pdf = await getDocumentProxy(bytes);
    const totalPages = pdf.numPages ?? 0;
    const pagesToRead = Math.min(totalPages, MAX_PAGES);
    const { text } = await extractText(pdf, { mergePages: true });

    let finalText = (text ?? '').trim();
    let truncated = false;
    if (finalText.length > MAX_CHARS) {
      finalText = finalText.slice(0, MAX_CHARS).trimEnd() + ' […texto truncado]';
      truncated = true;
    }
    if (totalPages > MAX_PAGES) truncated = true;

    return new Response(
      JSON.stringify({
        text: finalText,
        pages: pagesToRead,
        totalPages,
        truncated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err) {
    console.error('extract-pdf-text error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error)?.message ?? 'extraction failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});