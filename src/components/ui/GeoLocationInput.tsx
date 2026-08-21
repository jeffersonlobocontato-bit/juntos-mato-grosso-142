import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Search, CheckCircle, Loader2, XCircle } from 'lucide-react';

export interface GeoValue {
  city: string;       // city/municipality name
  lat: number | null;
  lng: number | null;
}

interface Props {
  value: GeoValue;
  onChange: (v: GeoValue) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

interface Suggestion {
  display_name: string;
  city: string;
  lat: string;
  lon: string;
}

// Reverse geocode lat/lng → city name via Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=pt-BR`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      data.display_name?.split(',')[0] ||
      'Localização encontrada'
    );
  } catch {
    return 'Localização encontrada';
  }
}

// Forward geocode city name → suggestions
async function forwardGeocode(query: string): Promise<Suggestion[]> {
  if (query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Paraná, Brasil')}&limit=6&accept-language=pt-BR&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      city:
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.county ||
        item.display_name.split(',')[0],
      lat: item.lat,
      lon: item.lon,
    }));
  } catch {
    return [];
  }
}

export function GeoLocationInput({ value, onChange, required = true, label = 'Localização Geográfica', placeholder = 'Digite o nome da cidade...' }: Props) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(value.city);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external city changes into local text
  useEffect(() => {
    setSearchText(value.city);
  }, [value.city]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('GPS não disponível neste dispositivo.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const city = await reverseGeocode(lat, lng);
        onChange({ city, lat, lng });
        setSearchText(city);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Permissão de localização negada. Use a busca manual.');
        } else {
          setGpsError('Não foi possível obter o GPS. Use a busca manual.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    // Clear confirmed location while typing
    if (text !== value.city) {
      onChange({ city: text, lat: null, lng: null });
    }
    setGpsError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await forwardGeocode(text);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSearchLoading(false);
    }, 500);
  };

  const selectSuggestion = (s: Suggestion) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    onChange({ city: s.city, lat, lng });
    setSearchText(s.city);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const clearValue = () => {
    onChange({ city: '', lat: null, lng: null });
    setSearchText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setGpsError(null);
  };

  const isConfirmed = value.lat !== null && value.lng !== null && value.city !== '';
  const isInvalid = required && searchText && !isConfirmed;

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>

      {/* GPS button */}
      <button
        type="button"
        onClick={handleGPS}
        disabled={gpsLoading}
        className="w-full h-10 rounded-xl border border-primary/40 bg-primary/8 text-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors disabled:opacity-60"
      >
        {gpsLoading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Obtendo localização via GPS...</>
          : <><Navigation className="w-4 h-4" />Usar minha localização atual (GPS)</>
        }
      </button>

      <div className="text-[10px] text-center text-muted-foreground">— ou busque pelo nome da cidade —</div>

      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={searchText}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            className={`w-full h-10 rounded-xl border pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors bg-background ${
              isConfirmed
                ? 'border-brand-green/60 ring-0 focus:ring-brand-green/30'
                : isInvalid
                ? 'border-destructive/60 focus:ring-destructive/30'
                : 'border-input focus:ring-primary/30'
            }`}
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          {!searchLoading && searchText && (
            <button
              type="button"
              onClick={clearValue}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0"
              >
                <div className="text-sm font-medium text-foreground">{s.city}</div>
                <div className="text-[10px] text-muted-foreground truncate">{s.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status feedback */}
      {isConfirmed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-green/10 border border-brand-green/30">
          <CheckCircle className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-brand-green">{value.city}</span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {value.lat?.toFixed(5)}, {value.lng?.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {gpsError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30">
          <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
          <span className="text-xs text-destructive">{gpsError}</span>
        </div>
      )}

      {required && !isConfirmed && !searchText && (
        <p className="text-[10px] text-muted-foreground">
          ⚠ Geolocalização obrigatória — use o GPS ou busque a cidade no campo acima.
        </p>
      )}
    </div>
  );
}
