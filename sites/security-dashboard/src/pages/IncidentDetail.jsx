import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [reportMsg, setReportMsg] = useState('');

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [id]);

  async function load() {
    try { setIncident(await api.incident(id)); } catch (_) {}
  }

  if (!incident) return <p className="muted">Loading incident...</p>;

  return (
    <div>
      <p className="eyebrow">Incident Response</p>
      <h2>Incident {incident.id}</h2>

      <div className="card-grid" style={{ marginTop: 16 }}>
        <div className="neu-card"><div className="stat-label">Attack Type</div><div style={{ fontSize: '1.3rem', marginTop: 4 }}>{incident.attack_type}</div></div>
        <div className="neu-card"><div className="stat-label">Risk</div><div className="stat-value">{Math.round(incident.risk_score * 100)}%</div></div>
        <div className="neu-card"><div className="stat-label">Confidence</div><div className="stat-value">{Math.round(incident.confidence_score * 100)}%</div></div>
        <div className="neu-card"><div className="stat-label">Status</div><div style={{ marginTop: 8 }}><span className={`badge badge-${incident.status === 'contained' ? 'contained' : 'alert'}`}>{incident.status}</span></div></div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>AI Agent Trail</h3>
        <div className="agent-status" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {incident.ai_investigations?.map((inv) => (
            <span key={inv.id} className={`agent-chip ${inv.status}`}>{inv.agent_name}: {inv.status}</span>
          ))}
        </div>
        <div className="timeline">
          {incident.ai_investigations?.map((inv) => (
            <div key={inv.id} className="timeline-item">
              <strong>{inv.agent_name}</strong>
              <p className="muted" style={{ fontSize: '0.85rem' }}>{inv.output_summary}</p>
            </div>
          ))}
        </div>
      </div>

      {incident.telemetry && (
        <div className="neu-card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Telemetry Evidence</h3>
          <table>
            <tbody>
              <tr><th>Source IP</th><td>{incident.telemetry.source_ip}</td></tr>
              <tr><th>Endpoint</th><td>{incident.telemetry.endpoint}</td></tr>
              <tr><th>Method</th><td>{incident.telemetry.http_method}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="neu-card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Containment</h3>
        {incident.recommendations?.map((rec) => (
          <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(159,179,169,0.1)' }}>
            <span>{rec.action.replace(/_/g, ' ')} — {rec.status}</span>
            {rec.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="neu-btn primary" onClick={() => api.contain(rec.id, true).then(load)}>Approve</button>
                <button className="neu-btn" onClick={() => api.contain(rec.id, false).then(load)}>Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="neu-btn primary" style={{ marginTop: 24 }} onClick={async () => {
        const r = await api.generateReport(id);
        setReportMsg(`Report: ${r.file_path}`);
      }}>Generate Report</button>
      {reportMsg && <p style={{ marginTop: 12, color: 'var(--accent-primary)' }}>{reportMsg}</p>}
    </div>
  );
}
