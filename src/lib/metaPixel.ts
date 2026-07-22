// Helper para disparar eventos do Meta Pixel a partir de componentes React.
// O script base (fbq) é carregado no <head> do index.html.
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export function trackMetaEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", eventName, params);
  } catch (e) {
    console.error("Meta Pixel trackMetaEvent error:", e);
  }
}

function fbqTrackWithId(eventName: string, params: Record<string, unknown>, eventId: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", eventName, params, { eventID: eventId });
  } catch (e) {
    console.error("Meta Pixel trackWithId error:", e);
  }
}

// Evento de conversão principal da campanha: alguém enviou uma sugestão popular.
// Dispara Pixel (browser) e Conversions API (server) com o MESMO event_id para deduplicação.
export function trackSugestaoLead(data?: {
  municipio?: string;
  nome?: string;
  telefone?: string;
  email?: string;
}) {
  const municipio = data?.municipio;
  const eventId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const customData = municipio
    ? { content_name: "sugestao_popular", municipio }
    : { content_name: "sugestao_popular" };

  fbqTrackWithId("Lead", customData, eventId);

  supabase.functions
    .invoke("meta-capi-lead", {
      body: {
        event_id: eventId,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        municipio,
        nome: data?.nome,
        telefone: data?.telefone,
        email: data?.email,
      },
    })
    .catch((err) => console.error("meta-capi-lead invoke error:", err));
}