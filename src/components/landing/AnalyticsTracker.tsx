import { useEffect, useRef } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

const AnalyticsTracker = () => {
  const { trackPageview, trackScrollDepth, trackComponentView } = useAnalytics();
  const trackedComponents = useRef<Set<string>>(new Set());

  // Track pageview on mount
  useEffect(() => {
    trackPageview();
  }, [trackPageview]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      trackScrollDepth(scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrollDepth]);

  // Track component visibility with Intersection Observer
  useEffect(() => {
    const componentNames = [
      'HeroSection',
      'StatsSection',
      'AboutSection',
      'SocialEngagementSection',
      'SuggestionForm',
      'MapSection',
      'Footer',
      'ChatBot',
      'FloatingShareButton',
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const componentName = entry.target.getAttribute('data-component');
          if (entry.isIntersecting && componentName && !trackedComponents.current.has(componentName)) {
            trackedComponents.current.add(componentName);
            trackComponentView(componentName);
          }
        });
      },
      { threshold: 0.3 }
    );

    // Observe all tracked components
    componentNames.forEach((name) => {
      const element = document.querySelector(`[data-component="${name}"]`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [trackComponentView]);

  return null; // Este componente não renderiza nada
};

export default AnalyticsTracker;
