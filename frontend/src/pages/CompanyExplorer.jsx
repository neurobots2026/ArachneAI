import { useEffect, useState } from 'react';
import { api } from '../api';

export default function CompanyExplorer() {
  const [tokens, setTokens] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setTokens(await api.honeytokens());
    } catch (_) {}
  }

  async function analyze() {
    setLoading(true);
    try {
      const s = await api.analyzeDeception();
      setStrategy(s);
    } finally {
      setLoading(false);
    }
  }

  async function deploy() {
    if (!strategy) return;
    setLoading(true);
    try {
      await api.generateDeception(strategy);
      await load();
    } finally {
      setLoading(false);
    }
  }

  const byDept = tokens.reduce((acc, t) => {
    const dept = t.department || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Company Explorer</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={analyze} disabled={loading}>
            AI Analyze Org
          </button>
          {strategy && (
            <button className="btn" onClick={deploy} disabled={loading}>
              Deploy Strategy
            </button>
          )}
        </div>
      </div>

      {strategy && (
        <div className="card section">
          <h3 style={{ marginBottom: 8 }}>AI Deception Strategy</h3>
          <p style={{ color: '#aaa', marginBottom: 12 }}>{strategy.justification}</p>
          <ul>
            {strategy.honeytokens?.map((h, i) => (
              <li key={i}>{h.type}: {h.name} → {h.placement_path}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        {Object.entries(byDept).map(([dept, deptTokens]) => (
          <div key={dept}>
            <div className="tree-folder">📁 {dept}</div>
            <ul className="tree">
              {deptTokens.map((t) => (
                <li key={t.id}>
                  🍯 {t.name} <span style={{ color: '#888' }}>({t.type})</span>
                  <div style={{ color: '#666', fontSize: '0.8rem', paddingLeft: 20 }}>{t.placement_path}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!tokens.length && <p style={{ color: '#888' }}>No honeytokens deployed. Use AI Analyze to generate.</p>}
      </div>
    </div>
  );
}
