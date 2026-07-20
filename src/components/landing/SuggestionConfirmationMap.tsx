import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

interface SuggestionConfirmationMapProps {
  municipioNome: string;
  latitude: number;
  longitude: number;
  eixoNome?: string;
  nome?: string;
  sugestao?: string;
  height?: number;
}

const SuggestionConfirmationMap = ({
  municipioNome,
  latitude,
  longitude,
  eixoNome,
  nome,
  sugestao,
  height = 200,
}: SuggestionConfirmationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: 10,
      attributionControl: false,
      interactive: true,
    });

    mapRef.current = map;

    map.on("load", () => {
      setIsLoaded(true);

      // Add pulsating marker
      const markerEl = document.createElement("div");
      markerEl.className = "suggestion-confirmation-marker";
      markerEl.innerHTML = `
        <div class="marker-pulse-ring"></div>
        <div class="marker-center"></div>
      `;

      // Add marker styles
      if (!document.getElementById("suggestion-confirmation-marker-style")) {
        const style = document.createElement("style");
        style.id = "suggestion-confirmation-marker-style";
        style.textContent = `
          .suggestion-confirmation-marker {
            width: 40px;
            height: 40px;
            position: relative;
          }
          .suggestion-confirmation-marker .marker-pulse-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.3);
            transform: translate(-50%, -50%);
            animation: suggestion-pulse 2s ease-in-out infinite;
          }
          .suggestion-confirmation-marker .marker-center {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #10b981;
            border: 3px solid white;
            transform: translate(-50%, -50%);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          @keyframes suggestion-pulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.6;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.6);
              opacity: 0.2;
            }
          }
          .suggestion-popup .mapboxgl-popup-content {
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          }
          .suggestion-popup .mapboxgl-popup-tip {
            border-top-color: rgba(0, 0, 0, 0.9);
          }
        `;
        document.head.appendChild(style);
      }

      const escape = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const trecho = sugestao
        ? escape(sugestao.length > 220 ? sugestao.slice(0, 220) + "…" : sugestao)
        : "";
      const nomeHtml = nome
        ? `<div style="font-size: 12px; color: rgba(255,255,255,0.85); margin-bottom: 6px;">${escape(nome)}</div>`
        : "";
      const eixoHtml = eixoNome
        ? `<div style="display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.2);padding:4px 10px;border-radius:12px;margin-top:8px;"><span style="width:8px;height:8px;border-radius:50%;background:#10b981;"></span><span style="font-size:11px;color:rgba(255,255,255,0.85);">${escape(eixoNome)}</span></div>`
        : "";
      const trechoHtml = trecho
        ? `<div style="font-size:12px;color:rgba(255,255,255,0.9);line-height:1.45;margin-top:6px;max-width:260px;text-align:left;">"${trecho}"</div>`
        : "";

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        className: "suggestion-popup",
      }).setHTML(`
        <div style="text-align: center;">
          <div style="font-weight: 700; color: #fff; font-size: 14px; margin-bottom: 2px;">${escape(municipioNome)}</div>
          ${nomeHtml}
          ${trechoHtml}
          ${eixoHtml}
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: markerEl, anchor: "center" })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map);

      markerEl.style.cursor = "pointer";
      markerEl.title = "Clique para ver sua sugestão";
      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        marker.togglePopup();
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, municipioNome, eixoNome, nome, sugestao]);

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{ height }} className="bg-muted/50 rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Mapa não disponível</p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative rounded-xl overflow-hidden border border-border">
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center z-10">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default SuggestionConfirmationMap;
