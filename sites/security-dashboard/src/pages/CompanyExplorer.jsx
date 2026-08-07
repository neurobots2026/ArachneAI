import { useEffect, useState } from 'react';
import { api } from '../api';

export default function CompanyExplorer() {
  const [tokens, setTokens] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTokens(await api.honeytokens()); } catch (_) {}
  }

  async function analyze() {
    setLoading(true);
    try { setStrategy(await api.analyzeDeception()); } finally { setLoading(false); }
  }

  async function deploy() {
    if (!strategy) return;
    setLoading(true);
    try { await api.generateDeception(strategy); await load(); } finally { setLoading(false); }
  }

  const byDept = tokens.reduce((acc, t) => {
    const dept = t.department || 'General';
    (acc[dept] = acc[dept] || []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p className="eyebrow">Deception Layer</p>
          <h2>Crestwood College — Honeytoken Map</h2>
          <p className="muted">Real vs fake content pairs deployed across the target site</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="neu-btn" onClick={analyze} disabled={loading}>AI Analyze Org</button>
          {strategy && <button className="neu-btn primary" onClick={deploy} disabled={loading}>Deploy Strategy</button>}
        </div>
      </div>

      {strategy && (
        <div className="neu-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8 }}>AI Deception Strategy</h3>
          <p className="muted" style={{ marginBottom: 12 }}>{strategy.justification}</p>
        </div>
      )}

      <div className="neu-card">
        {Object.entries(byDept).map(([dept, deptTokens]) => (
          <div key={dept}>
            <div className="tree-folder">📁 {dept}</div>
            <ul className="tree">
              {deptTokens.map((t) => (
                <li key={t.id}>
                  🍯 {t.name} <span className="muted">({t.type})</span>
                  <div className="muted" style={{ fontSize: '0.8rem', paddingLeft: 20 }}>{t.placement_path}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!tokens.length && <p className="muted">No honeytokens deployed.</p>}
      </div>
    </div>
  );
}
