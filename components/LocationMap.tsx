'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Coordinates } from '@/types';

interface Props {
  loc1: Coordinates;
  loc2: Coordinates;
}

// RainViewer API response shape
interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerData {
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';
const RADAR_OPACITY = 0.65;
const ANIMATION_INTERVAL_MS = 500;

export default function LocationMap({ loc1, loc2 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const radarLayersRef = useRef<any[]>([]);
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFrameRef = useRef<number>(0);

  const [radarEnabled, setRadarEnabled] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [frames, setFrames] = useState<{ host: string; frames: RainViewerFrame[] }>({ host: '', frames: [] });
  const [frameIndex, setFrameIndex] = useState(0);
  const [radarAge, setRadarAge] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Fetch RainViewer manifest
  useEffect(() => {
    fetch(RAINVIEWER_API)
      .then(r => r.json())
      .then((data: RainViewerData) => {
        const allFrames = [...(data.radar.past ?? []), ...(data.radar.nowcast ?? [])];
        setFrames({ host: data.host, frames: allFrames });
        const latest = data.radar.past?.at(-1);
        if (latest) {
          const d = new Date(latest.time * 1000);
          setRadarAge(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then(L => {
      const midLat = (loc1.lat + loc2.lat) / 2;
      const midLon = (loc1.lon + loc2.lon) / 2;

      const map = L.map(mapRef.current!, {
        center: [midLat, midLon],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });
      mapInstanceRef.current = map;

      // Dark base layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CartoDB',
        maxZoom: 19,
      }).addTo(map);

      // Location markers
      const blueIcon = L.divIcon({
        html: `<div style="background:#58a6ff;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #58a6ffaa;position:relative;z-index:999"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      });
      const redIcon = L.divIcon({
        html: `<div style="background:#f85149;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #f85149aa;position:relative;z-index:999"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      });

      L.marker([loc1.lat, loc1.lon], { icon: blueIcon })
        .addTo(map)
        .bindPopup(`<b style="font-family:monospace;font-size:12px">LOC 1</b><br/><span style="font-family:monospace;font-size:11px">${loc1.name}</span>`);

      L.marker([loc2.lat, loc2.lon], { icon: redIcon })
        .addTo(map)
        .bindPopup(`<b style="font-family:monospace;font-size:12px">LOC 2</b><br/><span style="font-family:monospace;font-size:11px">${loc2.name}</span>`);

      L.polyline([[loc1.lat, loc1.lon], [loc2.lat, loc2.lon]], {
        color: '#30363d',
        weight: 1.5,
        dashArray: '4 6',
      }).addTo(map);

      map.fitBounds(
        [[loc1.lat, loc1.lon], [loc2.lat, loc2.lon]],
        { padding: [48, 48], maxZoom: 9 }
      );
    });

    return () => {
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      radarLayersRef.current = [];
    };
  }, [loc1.lat, loc1.lon, loc2.lat, loc2.lon]);

  // Build radar tile layers whenever frames data arrives
  useEffect(() => {
    if (!frames.frames.length || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    import('leaflet').then(L => {
      // Remove existing radar layers
      radarLayersRef.current.forEach(l => map.removeLayer(l));
      radarLayersRef.current = [];

      // Create one TileLayer per frame, all hidden initially
      const layers = frames.frames.map(frame =>
        L.tileLayer(
          `${frames.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
          {
            opacity: 0,
            zIndex: 10,
            attribution: 'Radar ©RainViewer',
            tileSize: 256,
          }
        ).addTo(map)
      );

      radarLayersRef.current = layers;

      // Show the most recent past frame by default
      const latestPastIdx = frames.frames.length - 1;
      if (radarEnabled && layers[latestPastIdx]) {
        layers[latestPastIdx].setOpacity(RADAR_OPACITY);
        currentFrameRef.current = latestPastIdx;
        setFrameIndex(latestPastIdx);
      }
    });
  }, [frames]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show/hide radar when toggle changes
  useEffect(() => {
    if (!radarLayersRef.current.length) return;
    if (!radarEnabled) {
      radarLayersRef.current.forEach(l => l.setOpacity(0));
      stopAnimation();
    } else {
      radarLayersRef.current[currentFrameRef.current]?.setOpacity(RADAR_OPACITY);
    }
  }, [radarEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show a specific frame
  const showFrame = useCallback((idx: number) => {
    const layers = radarLayersRef.current;
    if (!layers.length) return;
    const clamped = Math.max(0, Math.min(idx, layers.length - 1));
    layers.forEach((l, i) => l.setOpacity(i === clamped ? RADAR_OPACITY : 0));
    currentFrameRef.current = clamped;
    setFrameIndex(clamped);
  }, []);

  // Animation loop
  const startAnimation = useCallback(() => {
    if (!radarLayersRef.current.length) return;
    setAnimating(true);

    const tick = () => {
      const next = (currentFrameRef.current + 1) % radarLayersRef.current.length;
      showFrame(next);
      animFrameRef.current = setTimeout(tick, ANIMATION_INTERVAL_MS);
    };
    animFrameRef.current = setTimeout(tick, ANIMATION_INTERVAL_MS);
  }, [showFrame]);

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) {
      clearTimeout(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAnimating(false);
  }, []);

  const toggleAnimation = useCallback(() => {
    if (animating) stopAnimation();
    else startAnimation();
  }, [animating, startAnimation, stopAnimation]);

  const frameTime = frames.frames[frameIndex]
    ? new Date(frames.frames[frameIndex].time * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : '—';

  const isNowcast = frameIndex >= (frames.frames.length - (frames.frames.length > 2 ? 1 : 0));

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg overflow-hidden">
      {/* ── Map header ── */}
      <div className="px-4 py-2.5 border-b border-[#21262d] flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
          Radar + Location Map
        </div>

        {/* Location legend */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400"></span>LOC 1
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400"></span>LOC 2
          </span>
        </div>

        {/* Radar controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Radar toggle */}
          <button
            onClick={() => setRadarEnabled(v => !v)}
            className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
              radarEnabled
                ? 'border-green-700 bg-green-900/30 text-green-400'
                : 'border-[#30363d] bg-[#21262d] text-slate-500'
            }`}
          >
            {radarEnabled ? '⬤ Radar ON' : '○ Radar OFF'}
          </button>

          {/* Animate button */}
          {radarEnabled && frames.frames.length > 1 && (
            <button
              onClick={toggleAnimation}
              className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                animating
                  ? 'border-yellow-700 bg-yellow-900/30 text-yellow-400'
                  : 'border-[#30363d] bg-[#21262d] text-slate-400 hover:text-slate-200'
              }`}
            >
              {animating ? '⏸ Pause' : '▶ Animate'}
            </button>
          )}

          {/* Frame timestamp */}
          {radarEnabled && frames.frames.length > 0 && (
            <span className={`text-[10px] font-mono ${isNowcast ? 'text-yellow-400' : 'text-slate-500'}`}>
              {isNowcast ? '▶ Forecast ' : ''}{frameTime}
            </span>
          )}

          {loading && (
            <span className="text-[10px] font-mono text-slate-600 animate-pulse">Loading radar…</span>
          )}
        </div>
      </div>

      {/* ── Scrubber ── */}
      {radarEnabled && frames.frames.length > 1 && (
        <div className="px-4 py-1.5 bg-[#0d1117] border-b border-[#21262d] flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">
            {new Date(frames.frames[0].time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
          <input
            type="range"
            min={0}
            max={frames.frames.length - 1}
            value={frameIndex}
            onChange={e => {
              stopAnimation();
              showFrame(parseInt(e.target.value));
            }}
            className="flex-1 h-1 accent-blue-400 cursor-pointer"
          />
          <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">
            {new Date(frames.frames[frames.frames.length - 1].time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      )}

      {/* ── Map canvas ── */}
      <div ref={mapRef} style={{ height: 420 }} />

      {/* ── Radar legend ── */}
      {radarEnabled && (
        <div className="px-4 py-2 bg-[#0d1117] border-t border-[#21262d] flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-600">Precipitation intensity →</span>
          <div className="flex items-center gap-0.5">
            {['#9bf5fe','#00b4ff','#0069b4','#009600','#00dc00','#ffff00','#e19600','#ff0000','#b40000','#ff00fb'].map((c, i) => (
              <div key={i} style={{ background: c, width: 14, height: 10, borderRadius: 1 }} />
            ))}
          </div>
          <span className="text-[10px] font-mono text-slate-600">Light → Heavy</span>
          <span className="text-[10px] font-mono text-slate-600 ml-auto">
            Radar: <a href="https://www.rainviewer.com" target="_blank" rel="noopener" className="text-slate-500 hover:text-slate-400">RainViewer</a>
          </span>
        </div>
      )}
    </div>
  );
}
