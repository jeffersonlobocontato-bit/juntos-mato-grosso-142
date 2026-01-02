import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Gerar ID único para sessão
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Gerar/recuperar visitor ID do localStorage
const getVisitorId = () => {
  const stored = localStorage.getItem('rota399_visitor_id');
  if (stored) return stored;
  
  const newId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  localStorage.setItem('rota399_visitor_id', newId);
  return newId;
};

// Detectar tipo de dispositivo
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Detectar browser
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
};

// Detectar OS
const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
};

// Extrair UTM params da URL
const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
  };
};

// Classificar referrer em canal
const getChannelFromReferrer = (referrer: string) => {
  if (!referrer) return 'direct';
  
  const ref = referrer.toLowerCase();
  if (ref.includes('google') || ref.includes('bing') || ref.includes('yahoo')) return 'organic';
  if (ref.includes('facebook') || ref.includes('instagram') || ref.includes('fb.')) return 'social-facebook';
  if (ref.includes('twitter') || ref.includes('x.com')) return 'social-twitter';
  if (ref.includes('linkedin')) return 'social-linkedin';
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'social-whatsapp';
  if (ref.includes('telegram') || ref.includes('t.me')) return 'social-telegram';
  if (ref.includes('tiktok')) return 'social-tiktok';
  if (ref.includes('youtube')) return 'social-youtube';
  
  return 'referral';
};

interface AnalyticsEvent {
  event_type: string;
  component_name?: string;
  component_action?: string;
  metadata?: Record<string, unknown>;
  scroll_depth?: number;
  time_on_page?: number;
}

// Singleton para sessão atual
let currentSessionId: string | null = null;
let visitorId: string | null = null;
let pageStartTime: number | null = null;
let maxScrollDepth = 0;

export const useAnalytics = () => {
  const hasTrackedPageview = useRef(false);
  
  // Inicializar IDs
  useEffect(() => {
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
    }
    if (!visitorId) {
      visitorId = getVisitorId();
    }
    if (!pageStartTime) {
      pageStartTime = Date.now();
    }
  }, []);

  // Função para enviar evento
  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
    }
    if (!visitorId) {
      visitorId = getVisitorId();
    }

    const utmParams = getUTMParams();
    const referrer = document.referrer;

    try {
      await supabase.from('page_analytics_events').insert({
        session_id: currentSessionId,
        visitor_id: visitorId,
        event_type: event.event_type,
        component_name: event.component_name || null,
        component_action: event.component_action || null,
        page_path: window.location.pathname,
        referrer: referrer || null,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        scroll_depth: event.scroll_depth || maxScrollDepth,
        time_on_page: event.time_on_page || (pageStartTime ? Math.floor((Date.now() - pageStartTime) / 1000) : 0),
        metadata: {
          ...event.metadata,
          channel: utmParams.utm_source || getChannelFromReferrer(referrer),
        },
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, []);

  // Track pageview (apenas uma vez por mount)
  const trackPageview = useCallback(() => {
    if (hasTrackedPageview.current) return;
    hasTrackedPageview.current = true;
    
    trackEvent({
      event_type: 'pageview',
    });
  }, [trackEvent]);

  // Track component view
  const trackComponentView = useCallback((componentName: string) => {
    trackEvent({
      event_type: 'component_view',
      component_name: componentName,
      component_action: 'view',
    });
  }, [trackEvent]);

  // Track component click
  const trackComponentClick = useCallback((componentName: string, action?: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      event_type: 'click',
      component_name: componentName,
      component_action: action || 'click',
      metadata,
    });
  }, [trackEvent]);

  // Track scroll depth
  const trackScrollDepth = useCallback((depth: number) => {
    if (depth > maxScrollDepth) {
      maxScrollDepth = depth;
    }
  }, []);

  // Track share
  const trackShare = useCallback((platform: string, componentName?: string) => {
    trackEvent({
      event_type: 'share',
      component_name: componentName || 'SocialShare',
      component_action: platform,
      metadata: { platform },
    });
  }, [trackEvent]);

  // Track form submit
  const trackFormSubmit = useCallback((formName: string, success: boolean) => {
    trackEvent({
      event_type: 'form_submit',
      component_name: formName,
      component_action: success ? 'success' : 'error',
    });
  }, [trackEvent]);

  // Track session end (before unload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pageStartTime) {
        // Usar sendBeacon para garantir envio
        const data = {
          session_id: currentSessionId,
          visitor_id: visitorId,
          event_type: 'session_end',
          page_path: window.location.pathname,
          scroll_depth: maxScrollDepth,
          time_on_page: Math.floor((Date.now() - pageStartTime) / 1000),
          device_type: getDeviceType(),
          browser: getBrowser(),
          os: getOS(),
          screen_width: window.innerWidth,
          screen_height: window.innerHeight,
        };
        
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/page_analytics_events`,
          JSON.stringify(data)
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    trackPageview,
    trackComponentView,
    trackComponentClick,
    trackScrollDepth,
    trackShare,
    trackFormSubmit,
    trackEvent,
  };
};

// Componente wrapper para tracking de componentes
export const useComponentTracking = (componentName: string) => {
  const { trackComponentView, trackComponentClick } = useAnalytics();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    
    // Observer para detectar quando o componente entra na viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true;
            trackComponentView(componentName);
          }
        });
      },
      { threshold: 0.5 }
    );

    // Procurar elemento pelo data-attribute
    const element = document.querySelector(`[data-component="${componentName}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [componentName, trackComponentView]);

  const handleClick = useCallback((action?: string, metadata?: Record<string, unknown>) => {
    trackComponentClick(componentName, action, metadata);
  }, [componentName, trackComponentClick]);

  return { handleClick };
};
