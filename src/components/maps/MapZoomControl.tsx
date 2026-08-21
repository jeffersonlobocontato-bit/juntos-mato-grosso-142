import { useMap } from 'react-leaflet';
import { Plus, Minus } from 'lucide-react';

export default function MapZoomControl() {
  const map = useMap();

  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-1">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        title="Aproximar"
        className="w-9 h-9 rounded-lg flex items-center justify-center bg-card border border-border text-foreground hover:bg-accent hover:text-primary transition-colors shadow-card"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        title="Afastar"
        className="w-9 h-9 rounded-lg flex items-center justify-center bg-card border border-border text-foreground hover:bg-accent hover:text-primary transition-colors shadow-card"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
}
