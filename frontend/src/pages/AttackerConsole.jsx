import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const scenarios = [
  { id: 'broken_auth', name: 'Broken Auth', category: 'Initial Access' },
  { id: 'ssrf', name: 'SSRF', category: 'Reconnaissance' },
  { id: 'xss', name: 'Stored XSS', category: 'Web Exploitation' },
  { id: 'idor', name: 'IDOR', category: 'Access Control' },
];

export default function AttackerConsole() {
  const [selected, setSelected] = useState('broken_auth');
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  useEffect(() => {
    setLog([{ event: 'ready', message: 'Select a scenario to begin.' }]);
  }, []);

  const grouped = useMemo(() => {
    return scenarios.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, []);

  async function launchScenario() {
    setStatus('running');
    setLog((prev) => [...prev, { event: 'launch', message: `Launching ${selected}...` }]);
    try {
      const result = await api.startSimulation(selected);
      setLog((prev) => [
        ...prev,
        { event: 'result', message: `Scenario ${result.scenario_name} started with id ${result.id}` },
      ]);
      setStatus('complete');
    } catch (error) {
      setStatus('error');
      setLog((prev) => [...prev, { event: 'error', message: error.message }]);
    }
  }

  return (
    <div>
      <div className="hero-card">
        <div>
          <p className="eyebrow">Attacker Console</p>
          <h2>Launch simulations against the Crestwood target environment</h2>
          <p className="muted">This view uses the existing simulation API and surfaces the attack flow in a tool-like interface.</p>
        </div>
        <button className="btn" onClick={launchScenario}>Launch {selected}</button>
      </div>

      <div className="console-grid">
        <div className="card">
          <h3>Scenario Library</h3>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <div className="muted" style={{ marginBottom: 8 }}>{category}</div>
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`scenario-card ${selected === item.id ? 'selected' : ''}`}
                  onClick={() => setSelected(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Live Activity</h3>
          <div className="status-pill">{status}</div>
          <div className="terminal-log">
            {log.map((entry, idx) => (
              <div key={`${entry.event}-${idx}`} className="log-line">[{entry.event}] {entry.message}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
