// Helper para disparar eventos do Meta Pixel a partir de componentes React.
// O script base (fbq) é carregado no <head> do index.html.

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

// Evento de conversão principal da campanha: alguém enviou uma sugestão popular.
export function trackSugestaoLead(municipio?: string) {
  trackMetaEvent("Lead", municipio ? { content_name: "sugestao_popular", municipio } : { content_name: "sugestao_popular" });
}