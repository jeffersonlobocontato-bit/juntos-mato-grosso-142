// Gerenciador central de consentimento de cookies (LGPD).
// Nada de Meta Pixel / Google Analytics deve disparar fora daqui.

export const CONSENT_KEY = "lgpd_cookie_consent";

export interface CookieConsent {
  analytics: boolean;
  ads: boolean;
  timestamp: number;
}

export function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

export function applyConsent(consent: Pick<CookieConsent, "analytics" | "ads">) {
  if (typeof window === "undefined") return;
  if (consent.analytics && typeof window.__initGoogleAnalytics === "function") {
    window.__initGoogleAnalytics();
  }
  if (consent.ads && typeof window.__initMetaPixel === "function") {
    window.__initMetaPixel();
  }
}

export function saveConsent(consent: Pick<CookieConsent, "analytics" | "ads">) {
  const full: CookieConsent = { ...consent, timestamp: Date.now() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(full));
  applyConsent(consent);
}

// Consentimento específico para compartilhar dados de um envio (opinião/lead)
// com o Meta CAPI — deve ser checado antes de chamar trackSugestaoLead().
export function hasAdsConsent(): boolean {
  const consent = getStoredConsent();
  return !!consent?.ads;
}

declare global {
  interface Window {
    __initMetaPixel?: () => void;
    __initGoogleAnalytics?: () => void;
  }
}
