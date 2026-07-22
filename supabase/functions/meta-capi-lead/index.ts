import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PIXEL_ID = '959625647096421';
const ACCESS_TOKEN = Deno.env.get('META_CAPI_ACCESS_TOKEN');

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'META_CAPI_ACCESS_TOKEN not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      event_id,
      event_source_url,
      municipio,
      nome,
      telefone,
      email,
    }: {
      event_id?: string;
      event_source_url?: string;
      municipio?: string;
      nome?: string;
      telefone?: string;
      email?: string;
    } = body || {};

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const user_data: Record<string, unknown> = {};
    if (email) user_data.em = [await sha256(email)];
    if (telefone) user_data.ph = [await sha256(telefone.replace(/\D/g, ''))];
    if (nome) {
      const parts = nome.trim().split(/\s+/);
      user_data.fn = [await sha256(parts[0] || '')];
      if (parts.length > 1) user_data.ln = [await sha256(parts.slice(1).join(' '))];
    }
    if (municipio) user_data.ct = [await sha256(municipio.replace(/\s+/g, ''))];
    user_data.country = [await sha256('br')];
    if (ip) user_data.client_ip_address = ip;
    if (userAgent) user_data.client_user_agent = userAgent;

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          event_id: event_id || crypto.randomUUID(),
          action_source: 'website',
          event_source_url: event_source_url || 'https://juntosparana399.com.br/',
          user_data,
          custom_data: { content_name: 'sugestao_popular', municipio: municipio || null },
        },
      ],
    };

    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const respJson = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error('Meta CAPI error:', respJson);
      return new Response(JSON.stringify({ error: 'meta_capi_error', detail: respJson }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, meta: respJson }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('meta-capi-lead exception', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});