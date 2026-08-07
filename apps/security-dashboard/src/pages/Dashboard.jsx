import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATE_LABELS = {
  normal: { icon: '🟢', label: 'NORMAL', desc: 'No open incidents. Monitoring live traffic from Crestwood College.' },
  investigating: { icon: '🟡', label: 'INVESTIGATING', desc: 'Open incident — AI agents analyzing telemetry.' },
  critical: { icon: '🔴', label: 'CRITICAL', desc: 'High risk score — awaiting human approval.' },
  contained: { icon: '⚪', label: 'CONTAINED', desc: 'Incident resolved — reports available.' },
};

export default function Dashboard() {
  const [dashStatus, setDashStatus] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [threats, setThreats] = useState([]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const [status, inc, t] = await Promise.all([api.status(), api.incidents(), api.threats()]);
      setDashStatus(status);
      setIncidents(inc);
      setThreats(t);
    } catch (_) {}
  }

  const stateInfo = STATE_LABELS[dashStatus?.state] || STATE_LABELS.normal;

  return (
    <div>
      <div className={`status-banner ${dashStatus?.state || 'normal'}`}>
        <div className="pulse-dot" />
        <div>
          <strong>{stateInfo.icon} {stateInfo.label}</strong>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>{stateInfo.desc}</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>{dashStatus?.open_incidents || 0} open incidents</span>
      </div>

      {dashStatus?.summary && (
        <div className="card-grid">
          <div className="neu-card"><div className="stat-value">{dashStatus.summary.total_incidents}</div><div className="stat-label">Total Incidents</div></div>
          <div className="neu-card"><div className="stat-value">{dashStatus.summary.open_incidents}</div><div className="stat-label">Open</div></div>
          <div className="neu-card"><div className="stat-value">{dashStatus.summary.critical_incidents}</div><div className="stat-label">Critical (≥70%)</div></div>
          <div className="neu-card"><div className="stat-value">{dashStatus.summary.honeytokens_deployed}</div><div className="stat-label">Honeytokens</div></div>
          <div className="neu-card"><div className="stat-value">{dashStatus.summary.telemetry_events_24h}</div><div className="stat-label">Alerts (24h)</div></div>
        </div>
      )}

      <div className="grid-2">
        <div>
          <h2 style={{ marginBottom: 16 }}>Live Activity Feed</h2>
          <div className="neu-card">
            {dashStatus?.recent_activity?.map((a) => (
              <div key={a.id} className="activity-item">
                <div className="desc">
                  <span className={`badge badge-${a.type === 'alert' ? 'alert' : a.type === 'incident' ? 'critical' : 'normal'}`}>{a.type}</span>
                  {' '}{a.description}
                </div>
                <span className="time">{new Date(a.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            {!dashStatus?.recent_activity?.length && (
              <p className="muted">No activity yet. Browse Crestwood College normally or launch an attack from the Attacker Console.</p>
            )}
          </div>
        </div>

        <div>
          <h2 style={{ marginBottom: 16 }}>Threat Breakdown</h2>
          <div className="neu-card">
            {threats.map((t) => (
              <div key={t.attack_type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(159,179,169,0.1)' }}>
                <span>{t.attack_type}</span>
                <span>{t.count} ({Math.round(t.avg_risk_score * 100)}% avg)</span>
              </div>
            ))}
            {!threats.length && <p className="muted">No threats recorded yet.</p>}
          </div>
        </div>
      </div>

      <h2 style={{ margin: '24px 0 16px' }}>Incidents</h2>
      <div className="neu-card">
        <table>
          <thead><tr><th>ID</th><th>Attack</th><th>Risk</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id}>
                <td><code>{inc.id}</code></td>
                <td>{inc.attack_type}</td>
                <td><span className={`badge ${inc.risk_score >= 0.7 ? 'badge-critical' : 'badge-alert'}`}>{Math.round(inc.risk_score * 100)}%</span></td>
                <td>{inc.status}</td>
                <td><Link to={`/incidents/${inc.id}`}>Investigate →</Link></td>
              </tr>
            ))}
            {!incidents.length && <tr><td colSpan={5} className="muted">No incidents — system is calm.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
