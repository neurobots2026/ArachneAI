import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [threats, setThreats] = useState([]);
  const [activity, setActivity] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      const [s, t, a, inc] = await Promise.all([
        api.summary(), api.threats(), api.activity(), api.incidents(),
      ]);
      setSummary(s);
      setThreats(t);
      setActivity(a);
      setIncidents(inc);
    } catch (_) {}
  }

  async function runSimulation() {
    await api.startSimulation('broken_auth');
    setTimeout(load, 3000);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Security Dashboard</h2>
        <button className="btn" onClick={runSimulation}>Run Broken Auth Simulation</button>
      </div>

      {summary && (
        <div className="card-grid">
          <div className="card">
            <div className="stat-value">{summary.total_incidents}</div>
            <div className="stat-label">Total Incidents</div>
          </div>
          <div className="card">
            <div className="stat-value">{summary.open_incidents}</div>
            <div className="stat-label">Open Incidents</div>
          </div>
          <div className="card">
            <div className="stat-value">{summary.critical_incidents}</div>
            <div className="stat-label">Critical (≥70% risk)</div>
          </div>
          <div className="card">
            <div className="stat-value">{summary.honeytokens_deployed}</div>
            <div className="stat-label">Honeytokens Deployed</div>
          </div>
          <div className="card">
            <div className="stat-value">{summary.telemetry_events_24h}</div>
            <div className="stat-label">Events (24h)</div>
          </div>
        </div>
      )}

      <div className="section">
        <h2>Live Incidents</h2>
        <div className="card">
          <table>
            <thead>
              <tr><th>ID</th><th>Attack</th><th>Risk</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id}>
                  <td><code>{inc.id}</code></td>
                  <td>{inc.attack_type}</td>
                  <td>
                    <span className={`badge ${inc.risk_score >= 0.7 ? 'badge-critical' : 'badge-open'}`}>
                      {Math.round(inc.risk_score * 100)}%
                    </span>
                  </td>
                  <td>{inc.status}</td>
                  <td><Link to={`/incidents/${inc.id}`}>View →</Link></td>
                </tr>
              ))}
              {!incidents.length && <tr><td colSpan={5} style={{ color: '#888' }}>No incidents yet. Run a simulation.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="section">
          <h2>Threat Breakdown</h2>
          <div className="card">
            {threats.map((t) => (
              <div key={t.attack_type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #2a2a4a' }}>
                <span>{t.attack_type}</span>
                <span>{t.count} ({Math.round(t.avg_risk_score * 100)}% avg)</span>
              </div>
            ))}
            {!threats.length && <p style={{ color: '#888' }}>No threats recorded.</p>}
          </div>
        </div>
        <div className="section">
          <h2>Recent Activity</h2>
          <div className="card">
            {activity.map((a) => (
              <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #2a2a4a' }}>
                <div>{a.description}</div>
                <div style={{ color: '#888', fontSize: '0.8rem' }}>{new Date(a.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
