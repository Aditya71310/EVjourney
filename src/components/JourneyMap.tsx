import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { Pause, Play, RotateCcw } from 'lucide-react';
import type { TimelineEvent } from '../types';

maplibregl.setWorkerUrl(workerUrl);

interface JourneyMapProps {
  events: TimelineEvent[];
  heightClass?: string;
}

const OPENFREEMAP_DARK = 'https://tiles.openfreemap.org/styles/dark';
const OPENFREEMAP_LIGHT = 'https://tiles.openfreemap.org/styles/positron';

const OSM_FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

function getMarkerColor(type: TimelineEvent['type']): string {
  switch (type) {
    case 'Starting point':
      return '#2DD4BF';
    case 'Destination':
      return '#FAFAFA';
    case 'Charging stop':
      return '#FBBF24';
    default:
      return '#60A5FA';
  }
}

function getIsDarkTheme(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark');
}

export function JourneyMap({ events, heightClass = 'h-[420px]' }: JourneyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const roverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);

  const [isDark, setIsDark] = useState<boolean>(getIsDarkTheme);
  const [playing, setPlaying] = useState(false);
  const [activeLegText, setActiveLegText] = useState<string>('');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(getIsDarkTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const validEvents = events.filter(
    (e) =>
      e.coordinates &&
      Number.isFinite(e.coordinates.lat) &&
      Number.isFinite(e.coordinates.lng) &&
      (e.coordinates.lat !== 0 || e.coordinates.lng !== 0)
  );

  const eventsKey = JSON.stringify(
    validEvents.map((e) => ({
      id: e._id,
      c: e.coordinates,
      t: e.type,
      title: e.title,
    }))
  );

  useEffect(() => {
    if (!containerRef.current) return;
    setPlaying(false);
    progressRef.current = 0;
    setActiveLegText('');

    const maptilerKey = import.meta.env.VITE_MAPTILER_KEY;
    const primaryStyle: string | maplibregl.StyleSpecification = maptilerKey
      ? `https://api.maptiler.com/maps/${isDark ? 'streets-v2-dark' : 'streets-v2'}/style.json?key=${maptilerKey}`
      : isDark
        ? OPENFREEMAP_DARK
        : OPENFREEMAP_LIGHT;

    const firstCoord: [number, number] =
      validEvents.length > 0
        ? [validEvents[0].coordinates.lng, validEvents[0].coordinates.lat]
        : [73.2, 18.5];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: primaryStyle,
      center: firstCoord,
      zoom: validEvents.length > 0 ? 7 : 4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    let fallbackApplied = false;
    let overlaysAdded = false;

    const addRouteAndMarkers = () => {
      if (overlaysAdded) return;
      overlaysAdded = true;

      if (validEvents.length >= 2) {
        const coordinates = validEvents.map((e) => [
          e.coordinates.lng,
          e.coordinates.lat,
        ]);

        if (!map.getSource('journey-route')) {
          map.addSource('journey-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates,
              },
            },
          });
        }

        if (!map.getLayer('journey-route-glow')) {
          map.addLayer({
            id: 'journey-route-glow',
            type: 'line',
            source: 'journey-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#2DD4BF',
              'line-width': 7,
              'line-opacity': 0.25,
            },
          });
        }

        if (!map.getLayer('journey-route-line')) {
          map.addLayer({
            id: 'journey-route-line',
            type: 'line',
            source: 'journey-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#2DD4BF',
              'line-width': 3,
            },
          });
        }
      }

      const bounds = new maplibregl.LngLatBounds();
      validEvents.forEach((ev, index) => {
        const color = getMarkerColor(ev.type);
        const el = document.createElement('button');
        el.type = 'button';
        el.className =
          'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold shadow-md transition-transform hover:scale-110 focus:outline-none';
        el.style.backgroundColor = '#141417';
        el.style.border = `2px solid ${color}`;
        el.style.color = color;
        el.textContent = ev.type === 'Charging stop' ? '⚡' : String(index + 1);

        const popupHtml = `
          <div style="min-width:170px">
            <div style="font-size:11px;color:#A1A1AA;margin-bottom:2px">${ev.type}</div>
            <div style="font-size:13px;font-weight:600;color:#FAFAFA">${ev.title}</div>
            <div style="font-size:12px;color:#A1A1AA;margin-top:2px">${ev.location}</div>
            ${
              ev.chargingDetail
                ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #2E2E33;font-size:11px;color:#2DD4BF;font-family:monospace">${ev.chargingDetail.startSOC}% → ${ev.chargingDetail.endSOC}% · ${ev.chargingDetail.energyKwh} kWh</div>`
                : ''
            }
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml);

        new maplibregl.Marker({ element: el })
          .setLngLat([ev.coordinates.lng, ev.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        bounds.extend([ev.coordinates.lng, ev.coordinates.lat]);
      });

      if (validEvents.length >= 2) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 12, duration: 700 });
      } else if (validEvents.length === 1) {
        map.flyTo({
          center: [validEvents[0].coordinates.lng, validEvents[0].coordinates.lat],
          zoom: 11,
        });
      }
    };

    map.on('load', addRouteAndMarkers);
    map.on('error', (e) => {
      if (!fallbackApplied && !overlaysAdded && e?.error) {
        fallbackApplied = true;
        map.setStyle(OSM_FALLBACK_STYLE);
        map.once('style.load', addRouteAndMarkers);
      }
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (roverMarkerRef.current) {
        roverMarkerRef.current.remove();
        roverMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [eventsKey, isDark]);

  // Route Playback Animation Loop
  useEffect(() => {
    const map = mapRef.current;
    if (!playing || !map || validEvents.length < 2) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (!roverMarkerRef.current) {
      const roverEl = document.createElement('div');
      roverEl.className =
        'w-5 h-5 rounded-full bg-[#2DD4BF] border-2 border-white shadow-[0_0_14px_rgba(45,212,191,0.9)]';
      roverMarkerRef.current = new maplibregl.Marker({ element: roverEl })
        .setLngLat([validEvents[0].coordinates.lng, validEvents[0].coordinates.lat])
        .addTo(map);
    }

    let lastTime = performance.now();
    const totalLegs = validEvents.length - 1;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      progressRef.current += dt * 0.22; // ~4.5s per full trip playback
      if (progressRef.current >= 1) {
        progressRef.current = 1;
        const last = validEvents[validEvents.length - 1];
        roverMarkerRef.current?.setLngLat([last.coordinates.lng, last.coordinates.lat]);
        setActiveLegText(`Arrived · ${last.location}`);
        setPlaying(false);
        return;
      }

      const scaled = progressRef.current * totalLegs;
      const segIdx = Math.min(totalLegs - 1, Math.floor(scaled));
      const t = scaled - segIdx;
      const a = validEvents[segIdx];
      const b = validEvents[segIdx + 1];

      const lng = a.coordinates.lng + (b.coordinates.lng - a.coordinates.lng) * t;
      const lat = a.coordinates.lat + (b.coordinates.lat - a.coordinates.lat) * t;
      roverMarkerRef.current?.setLngLat([lng, lat]);
      setActiveLegText(`${a.location.split(',')[0]} → ${b.location.split(',')[0]}`);

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, eventsKey]);

  const handleResetPlayback = () => {
    setPlaying(false);
    progressRef.current = 0;
    setActiveLegText('');
    if (roverMarkerRef.current) {
      roverMarkerRef.current.remove();
      roverMarkerRef.current = null;
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div ref={containerRef} className={`w-full ${heightClass}`} />

      {/* Route Playback + Legend Bar */}
      {validEvents.length >= 2 && (
        <div className="absolute left-3 bottom-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-md px-2.5 py-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => {
                if (progressRef.current >= 1) progressRef.current = 0;
                setPlaying((p) => !p);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary-fg)] hover:opacity-90"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{playing ? 'Pause' : 'Play Route'}</span>
            </button>
            {(playing || progressRef.current > 0) && (
              <button
                type="button"
                onClick={handleResetPlayback}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                aria-label="Reset route playback"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {activeLegText && (
              <span className="px-1.5 text-[11px] font-mono text-[var(--text)] truncate max-w-[200px]">
                {activeLegText}
              </span>
            )}
          </div>

          <div className="pointer-events-auto hidden sm:inline-flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-md px-3 py-1.5 text-[11px] text-[var(--text-muted)] shadow-lg">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#2DD4BF]" />
              Start
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
              Charging ⚡
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#60A5FA]" />
              Stop
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#FAFAFA] border border-[var(--border)]" />
              Destination
            </span>
          </div>
        </div>
      )}

      {validEvents.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A]/80 text-center px-6">
          <p className="text-sm font-medium text-[#FAFAFA]">
            No GPS waypoints added yet
          </p>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Add coordinates to your timeline events to plot the route and charging stops.
          </p>
        </div>
      )}
    </div>
  );
}
