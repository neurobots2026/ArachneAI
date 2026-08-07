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
    try {
      setIncident(await api.incident(id));
    } catch (_) {}
  }

  async function approve(recId) {
    await api.contain(recId, true);
    load();
  }

  async function reject(recId) {
    await api.contain(recId, false);
    load();
  }

  async function generateReport() {
    const report = await api.generateReport(id);
    setReportMsg(`Report generated: ${report.file_path}`);
  }

  if (!incident) return <div>Loading...</div>;

  return (
    <div>
      <h2>Incident {incident.id}</h2>
      <div className="card-grid" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="stat-label">Attack Type</div>
          <div style={{ fontSize: '1.4rem', marginTop: 4 }}>{incident.attack_type}</div>
        </div>
        <div className="card">
          <div className="stat-label">Risk Score</div>
          <div className="stat-value">{Math.round(incident.risk_score * 100)}%</div>
        </div>
        <div className="card">
          <div className="stat-label">Confidence</div>
          <div className="stat-value">{Math.round(incident.confidence_score * 100)}%</div>
        </div>
        <div className="card">
          <div className="stat-label">Status</div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge badge-${incident.status === 'contained' ? 'contained' : 'open'}`}>
              {incident.status}
            </span>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Live Agent Conversation</h2>
        <div className="agent-status">
          {incident.ai_investigations?.map((inv) => (
            <span key={inv.id} className={`agent-chip ${inv.status}`}>
              {inv.agent_name}: {inv.status}
            </span>
          ))}
        </div>
        <div className="timeline">
          {incident.ai_investigations?.map((inv) => (
            <div key={inv.id} className="timeline-item">
              <strong>{inv.agent_name}</strong>
              <p style={{ color: '#aaa', fontSize: '0.85rem' }}>{inv.output_summary}</p>
            </div>
          ))}
        </div>
      </div>

      {incident.telemetry && (
        <div className="section">
          <h2>Telemetry</h2>
          <div className="card">
            <table>
              <tbody>
                <tr><th>Source IP</th><td>{incident.telemetry.source_ip}</td></tr>
                <tr><th>Endpoint</th><td>{incident.telemetry.endpoint}</td></tr>
                <tr><th>Method</th><td>{incident.telemetry.http_method}</td></tr>
                <tr><th>User Agent</th><td>{incident.telemetry.user_agent}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="section">
        <h2>AI Reasoning</h2>
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ccc' }}>{incident.ai_reasoning}</pre>
        </div>
      </div>

      <div className="section">
        <h2>Containment Recommendations</h2>
        <div className="card">
          {incident.recommendations?.map((rec) => (
            <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #2a2a4a' }}>
              <span>{rec.action.replace(/_/g, ' ')} — <em>{rec.status}</em></span>
              {rec.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => approve(rec.id)}>Approve</button>
                  <button className="btn btn-secondary" onClick={() => reject(rec.id)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="btn" onClick={generateReport}>Generate PDF Report</button>
      {reportMsg && <p style={{ marginTop: 12, color: '#27ae60' }}>{reportMsg}</p>}
    </div>
  );
}
