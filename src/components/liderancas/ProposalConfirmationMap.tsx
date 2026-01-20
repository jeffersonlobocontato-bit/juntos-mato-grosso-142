import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface ProposalConfirmationMapProps {
  municipioNome: string;
  latitude: number;
  longitude: number;
  eixoNome: string;
  titulo: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

const eixoColors: Record<string, string> = {
  "Saúde": "#ef4444",
  "Educação": "#3b82f6",
  "Segurança Pública": "#f59e0b",
  "Infraestrutura": "#8b5cf6",
  "Meio Ambiente": "#22c55e",
  "Economia": "#ec4899",
  "Tecnologia": "#14b8a6",
  "Desenvolvimento Social": "#f97316",
};

const getEixoColor = (eixo: string): string => {
  const normalized = eixo.toLowerCase();
  for (const [key, color] of Object.entries(eixoColors)) {
    if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return color;
    }
  }
  return "#10b981"; // emerald default
};

const ProposalConfirmationMap = ({
  municipioNome,
  latitude,
  longitude,
  eixoNome,
  titulo,
}: ProposalConfirmationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: 8,
      interactive: false, // Read-only map
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setIsLoaded(true);

      // Create custom marker element with pulse animation
      const markerEl = document.createElement("div");
      markerEl.className = "proposal-marker";
      markerEl.innerHTML = `
        <div class="marker-pulse" style="background-color: ${getEixoColor(eixoNome)}40;"></div>
        <div class="marker-dot" style="background-color: ${getEixoColor(eixoNome)};"></div>
      `;

      // Add CSS for pulse animation
      const style = document.createElement("style");
      style.textContent = `
        .proposal-marker {
          position: relative;
          width: 40px;
          height: 40px;
        }
        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        }
        .marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        className: "confirmation-popup",
      }).setHTML(`
        <div style="padding: 8px;">
          <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${municipioNome}</div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.7);">${eixoNome}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titulo}</div>
        </div>
      `);

      // Add marker
      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: "center",
      })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map);

      markerRef.current = marker;

      // Show popup by default
      marker.togglePopup();

      // Add popup styling
      const popupStyle = document.createElement("style");
      popupStyle.textContent = `
        .confirmation-popup .mapboxgl-popup-content {
          background: rgba(0,0,0,0.85);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 0;
        }
        .confirmation-popup .mapboxgl-popup-tip {
          border-top-color: rgba(0,0,0,0.85);
        }
      `;
      document.head.appendChild(popupStyle);
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, eixoNome, titulo, municipioNome]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-[300px] bg-muted/50 rounded-xl flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Mapa não disponível</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[300px] rounded-xl overflow-hidden border border-border">
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center z-10">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default ProposalConfirmationMap;
