'use client';

import { useState } from 'react';
import type { Coordinates } from '@/types';

interface Props {
  label: string;
  placeholder?: string;
  onResolved: (coords: Coordinates) => void;
  onError: (msg: string) => void;
  resolved: Coordinates | null;
  accentColor?: 'blue' | 'red';
}

export default function LocationInput({
  label,
  placeholder = 'City, State or lat,lon',
  onResolved,
  onError,
  resolved,
  accentColor = 'blue',
}: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const accent = accentColor === 'blue'
    ? 'border-blue-600 focus:border-blue-400 focus:ring-blue-500/20'
    : 'border-red-700 focus:border-red-500 focus:ring-red-500/20';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(value.trim())}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const coords: Coordinates = await res.json();
      onResolved(coords);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to resolve location');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-[#0d1117] border rounded px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-600
            focus:outline-none focus:ring-1 transition-colors ${accent}`}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="px-4 py-2 text-xs font-mono font-medium rounded border border-[#30363d]
            bg-[#21262d] text-slate-300 hover:bg-[#30363d] hover:text-slate-100
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? 'Resolving…' : 'Set'}
        </button>
      </form>
      {resolved && (
        <div className="mt-1 text-[10px] font-mono text-slate-500">
          ✓ {resolved.name} ({resolved.lat.toFixed(4)}, {resolved.lon.toFixed(4)})
        </div>
      )}
    </div>
  );
}
