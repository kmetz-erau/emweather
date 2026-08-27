'use client';

import { useEffect, useState } from 'react';
import type { AlertsData, OperationsBriefing, WeatherData } from '@/types';

export default function OperationsBriefingPanel({ weather, alerts, initialRole = 'Facilities leadership' }: { weather: WeatherData[]; alerts: Array<AlertsData | null>; initialRole?: string }) {
  const [briefing, setBriefing] = useState<OperationsBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const [role, setRole] = useState(initialRole);

  useEffect(() => {
    setLoading(true); setError('');
    fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'briefing', weather, alerts, role }) })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Briefing unavailable'); return r.json(); })
      .then(setBriefing).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [weather, alerts, role]);

  async function ask() {
    if (!question.trim()) return;
    setAsking(true); setAnswer('');
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'ask', question, weather, alerts, role }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Question failed');
      setAnswer(data.answer);
    } catch (e) { setAnswer(e instanceof Error ? e.message : 'Question failed'); }
    finally { setAsking(false); }
  }

  const statusColor = briefing?.overallStatus === 'action' ? 'border-red-700 bg-red-950/20' : briefing?.overallStatus === 'watch' ? 'border-yellow-700 bg-yellow-950/10' : 'border-emerald-800 bg-emerald-950/10';
  return <div className={`border rounded-lg overflow-hidden ${statusColor}`}>
    <div className="px-4 py-3 border-b border-[#30363d] flex justify-between gap-3">
      <div><div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Campus Operations Briefing</div><div className="text-xs text-slate-400 mt-1">Evidence-grounded weather guidance</div></div>
      <div className="flex items-center gap-2"><select aria-label="Briefing audience" value={role} onChange={e => setRole(e.target.value)} className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-[10px] text-slate-300"><option>Facilities leadership</option><option>Energy manager</option><option>Grounds</option><option>Public safety</option><option>Maintenance supervisors</option></select>{briefing && <span className="text-[10px] uppercase font-mono text-slate-500">{briefing.generatedBy === 'ai' ? 'AI assisted' : 'Rules mode'} · {briefing.confidence} confidence</span>}</div>
    </div>
    <div className="p-4">
      {loading && <p className="text-sm text-slate-500 animate-pulse">Preparing operations briefing…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {briefing && <><p className="text-sm text-slate-200 mb-4">{briefing.executiveSummary}</p><div className="grid lg:grid-cols-2 gap-4">
        {briefing.locations.map(loc => <div key={loc.name} className="bg-[#0d1117]/60 rounded border border-[#30363d] p-3"><h3 className="font-mono text-xs text-blue-300 mb-2">{loc.name}</h3><p className="text-xs leading-5 text-slate-300">{loc.summary}</p>{loc.recommendedActions.length > 0 && <ul className="mt-2 space-y-1">{loc.recommendedActions.map(a => <li key={a} className="text-xs text-slate-400">• {a}</li>)}</ul>}</div>)}
      </div></>}
      <div className="mt-4 pt-4 border-t border-[#30363d]"><label className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Ask WeatherOps</label><div className="flex gap-2 mt-2"><input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="When is the highest outdoor-work risk?" className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-600"/><button onClick={ask} disabled={asking || !question.trim()} className="px-4 py-2 rounded bg-blue-600 disabled:opacity-40 text-xs">{asking ? 'Asking…' : 'Ask'}</button></div>{answer && <div className="mt-3 text-xs leading-5 text-slate-300 bg-[#0d1117]/60 rounded p-3 border border-[#30363d] whitespace-pre-wrap">{answer}</div>}</div>
    </div>
  </div>;
}
