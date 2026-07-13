'use client';

import type { AlertsData } from '@/types';
import { formatAlertTime } from '@/lib/alerts';
import { alertSeverityColor } from '@/lib/calculations';

interface Props {
  alerts1: AlertsData | null;
  alerts2: AlertsData | null;
  loc1Name: string;
  loc2Name: string;
}

function AlertCard({ alert }: { alert: AlertsData['alerts'][number] }) {
  const colorClass = alertSeverityColor(alert.severity);
  return (
    <div className={`border-l-2 pl-3 py-2 mb-3 last:mb-0 ${colorClass}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono text-sm font-semibold">{alert.event}</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
          alert.severity === 'Extreme' ? 'bg-red-900/50' :
          alert.severity === 'Severe' ? 'bg-orange-900/50' :
          alert.severity === 'Moderate' ? 'bg-yellow-900/50' : 'bg-slate-800'
        }`}>
          {alert.severity}
        </span>
      </div>
      {alert.headline && (
        <p className="text-xs text-slate-300 font-mono mb-1.5 leading-relaxed">{alert.headline}</p>
      )}
      {alert.areaDesc && (
        <p className="text-[10px] text-slate-500 font-mono mb-1">
          📍 {alert.areaDesc.slice(0, 120)}{alert.areaDesc.length > 120 ? '…' : ''}
        </p>
      )}
      <div className="flex gap-4 text-[10px] font-mono text-slate-500">
        <span>Effective: {formatAlertTime(alert.effective)}</span>
        <span>Expires: {formatAlertTime(alert.expires)}</span>
      </div>
      {alert.instruction && (
        <p className="text-[10px] text-slate-400 font-mono mt-1.5 leading-relaxed">
          {alert.instruction.slice(0, 200)}{alert.instruction.length > 200 ? '…' : ''}
        </p>
      )}
    </div>
  );
}

function AlertGroup({ data, locName }: { data: AlertsData | null; locName: string }) {
  if (!data) return null;

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">NWS Alerts</div>
          <div className="text-slate-300 font-mono text-sm font-medium mt-0.5">{locName}</div>
        </div>
        {data.alerts.length > 0 ? (
          <div className="text-xs font-mono text-yellow-400 border border-yellow-700 bg-yellow-900/20 px-2 py-0.5 rounded">
            {data.alerts.length} active
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-600 border border-[#21262d] px-2 py-0.5 rounded">
            No alerts
          </div>
        )}
      </div>

      {data.alerts.length === 0 ? (
        <p className="text-sm text-slate-600 font-mono">
          No active watches, warnings, or advisories.
          {!data.fetchedAt && ' (Outside NWS coverage area)'}
        </p>
      ) : (
        <div>
          {data.alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {data.fetchedAt > 0 && (
        <div className="text-[10px] text-slate-600 font-mono mt-3 pt-2 border-t border-[#21262d]">
          Updated: {new Date(data.fetchedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default function AlertsPanel({ alerts1, alerts2, loc1Name, loc2Name }: Props) {
  return (
    <div>
      <h2 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">
        Active Watches · Warnings · Advisories
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertGroup data={alerts1} locName={loc1Name} />
        <AlertGroup data={alerts2} locName={loc2Name} />
      </div>
    </div>
  );
}
