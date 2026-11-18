import { useMemo, useState } from 'react';
import { ChevronDown, Crosshair, MapPin } from 'lucide-react';
import locationsCatalog from '../data/locations.json';

interface LocationPreset {
  name: string;
  region: string;
  lat: number;
  lng: number;
  tag: string;
}

interface LocationPickerProps {
  label: string;
  value: string;
  lat: string;
  lng: string;
  placeholder?: string;
  required?: boolean;
  onChange: (next: { location: string; lat: string; lng: string }) => void;
}

const PRESETS = locationsCatalog as LocationPreset[];

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply straight-line distance by typical highway curvature factor (1.28)
  return Math.round(straight * 1.28);
}

export function LocationPicker({
  label,
  value,
  lat,
  lng,
  placeholder = 'Search city, highway hub, or mountain pass...',
  required = false,
  onChange,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState('');

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return PRESETS.slice(0, 7);
    return PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [value]);

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setGeoHint('GPS not available in this browser');
      return;
    }
    setLocating(true);
    setGeoHint('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude.toFixed(4);
        const nextLng = pos.coords.longitude.toFixed(4);
        onChange({
          location: value.trim() || `Current GPS (${nextLat}, ${nextLng})`,
          lat: nextLat,
          lng: nextLng,
        });
        setGeoHint('GPS coordinates locked');
        setLocating(false);
      },
      () => {
        setGeoHint('Permission denied — pick a hub or enter manually');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentGps}
            disabled={locating}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
          >
            <Crosshair className="h-3 w-3" />
            <span>{locating ? 'Locating...' : 'Use GPS'}</span>
          </button>
          <span className="text-[var(--border)]" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => setShowCoords((s) => !s)}
            className="inline-flex items-center gap-0.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <span>{showCoords ? 'Hide GPS' : 'Edit GPS'}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showCoords ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--primary)] pointer-events-none" />
        <input
          type="text"
          required={required}
          value={value}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onChange={(e) => {
            onChange({ location: e.target.value, lat, lng });
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] pl-9 pr-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
        />

        {open && matches.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl divide-y divide-[var(--border)]">
            {matches.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({
                    location: preset.name,
                    lat: String(preset.lat),
                    lng: String(preset.lng),
                  });
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--text)] truncate">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {preset.region}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-[var(--primary)]">
                  {preset.tag}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
        <span>
          Pin: {Number(lat || 0).toFixed(3)}°, {Number(lng || 0).toFixed(3)}°
        </span>
        {geoHint && <span className="font-sans text-[var(--primary)]">{geoHint}</span>}
      </div>

      {showCoords && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <label className="block text-[10px] text-[var(--text-muted)]">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) =>
                onChange({ location: value, lat: e.target.value, lng })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-mono text-[var(--text)]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] text-[var(--text-muted)]">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) =>
                onChange({ location: value, lat, lng: e.target.value })
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs font-mono text-[var(--text)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
