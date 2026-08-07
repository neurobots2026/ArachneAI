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
  const summary = dashStatus?.summary || {};

  return (
    <div className="dashboard-home">
      <div className="dashboard-heading">
        <div><span className="eyebrow">Crestwood College · Security operations</span><h1>Good evening, analyst.</h1><p className="muted">A calm view of your deception perimeter.</p></div>
        <span className="live-chip"><span className="pulse-dot" /> LIVE TELEMETRY</span>
      </div>
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
          <div className="glass-card kpi"><span className="kpi-icon">◉</span><div className="stat-value">{summary.open_incidents || 0}</div><div className="stat-label">Open incidents</div></div>
          <div className="glass-card kpi"><span className="kpi-icon">✦</span><div className="stat-value">{summary.honeytokens_deployed || 0}</div><div className="stat-label">Honeytokens active</div></div>
          <div className="glass-card kpi"><span className="kpi-icon">⌁</span><div className="stat-value">{Math.round((summary.avg_risk_score || 0) * 100)}%</div><div className="stat-label">Average risk score</div></div>
          <div className="glass-card kpi"><span className="kpi-icon">↗</span><div className="stat-value">{summary.telemetry_events_24h || 0}</div><div className="stat-label">Alerts (24h)</div></div>
        </div>
      )}

      <div className="hero-grid">
        <section className="glass-card trend-card"><div className="panel-heading"><div><span className="eyebrow">Threat pulse</span><h2>Incidents over time</h2></div><span className="range-pill">Last 24 hours⌄</span></div><svg className="trend-chart" viewBox="0 0 700 180" role="img" aria-label="Incident trend"><defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2fdd8f" stopOpacity=".35"/><stop offset="1" stopColor="#2fdd8f" stopOpacity="0"/></linearGradient></defs><path d="M0 145 C100 80 130 140 220 105 S350 45 430 92 S550 120 700 28 L700 180 L0 180Z" fill="url(#trendFill)"/><path d="M0 145 C100 80 130 140 220 105 S350 45 430 92 S550 120 700 28" fill="none" stroke="#2fdd8f" strokeWidth="3"/><path d="M0 150 C120 145 180 130 280 145 S450 110 700 92" fill="none" stroke="#d2b36d" strokeWidth="2" strokeDasharray="5 8"/></svg><div className="chart-legend"><span><i className="legend-green"/> Honeytoken events</span><span><i className="legend-gold"/> Baseline anomalies</span><b>{summary.total_incidents || 0} total</b></div></section>
        <section className={`glass-card spotlight ${dashStatus?.state === 'critical' ? 'critical' : ''}`}><span className="eyebrow">Incident spotlight</span><h2>{dashStatus?.state === 'critical' ? 'Critical incident open' : 'Perimeter nominal'}</h2><p>{dashStatus?.state === 'critical' ? 'Human approval is required before containment.' : 'No critical deception signals require attention.'}</p><div className="ring"><strong>{Math.round((summary.avg_risk_score || 0) * 100)}%</strong><span>risk</span></div><button className="neu-btn">View incident queue →</button></section>
      </div>

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
