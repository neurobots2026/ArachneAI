import { useEffect, useMemo, useState } from 'react';
import { api, setToken } from './api';

const SCENARIOS = [
  { id: 'broken_auth', name: 'Broken Auth', category: 'Initial Access', target: '/target/auth/login' },
  { id: 'ssrf', name: 'SSRF', category: 'Reconnaissance', target: '/target/admin/fetch' },
  { id: 'xss', name: 'Stored XSS', category: 'Web Exploitation', target: '/target/courses/review' },
  { id: 'csrf', name: 'CSRF', category: 'Web Exploitation', target: '/target/profile/update' },
  { id: 'idor', name: 'IDOR', category: 'Access Control', target: '/target/students/{id}' },
  { id: 'command_injection', name: 'Command Injection', category: 'Execution', target: '/target/admin/ping' },
  { id: 'file_upload', name: 'File Upload', category: 'Execution', target: '/target/admin/upload' },
  { id: 'api_abuse', name: 'API Abuse', category: 'Privilege Escalation', target: '/target/api/register-bulk' },
  { id: 'session_attack', name: 'Session Attack', category: 'Session Hijacking', target: '/target/api/session' },
  { id: 'mitm', name: 'MITM (Simulated)', category: 'Network', target: '/target/api/secure' },
  { id: 'dns_redirect', name: 'DNS / Redirect', category: 'Phishing', target: '/target/go' },
  { id: 'deserialization', name: 'Deserialization', category: 'Execution', target: '/target/admin/import-settings' },
  { id: 'xxe', name: 'XXE', category: 'Injection', target: '/target/admin/import-xml' },
  { id: 'cache_poisoning', name: 'Cache Poisoning', category: 'Web Exploitation', target: '/target/api/cache' },
  { id: 'supply_chain', name: 'Supply Chain', category: 'Supply Chain', target: '/target/api/package' },
];

function Login({ onAuth }) {
  const [email, setEmail] = useState('secops@crestwood.edu');
  const [password, setPassword] = useState('secops123');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      onAuth();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="login-wrap">
      <div className="neu-card login-box">
        <p className="eyebrow">Attacker Console</p>
        <h2>Authenticate to Launch Simulations</h2>
        <p className="muted" style={{ marginBottom: 16 }}>Uses platform credentials to drive attack scenarios against Crestwood College.</p>
        {error && <p style={{ color: 'var(--accent-alert)', marginBottom: 12 }}>{error}</p>}
        <form onSubmit={submit}>
          <input className="neu-input" style={{ marginBottom: 12 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input className="neu-input" style={{ marginBottom: 12 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button className="neu-btn primary" type="submit" style={{ width: '100%' }}>Enter Console</button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('arachne_token'));
  const [selected, setSelected] = useState('broken_auth');
  const [status, setStatus] = useState('ready');
  const [simId, setSimId] = useState(null);
  const [logs, setLogs] = useState([]);

  const grouped = useMemo(() => SCENARIOS.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {}), []);

  const current = SCENARIOS.find((s) => s.id === selected);

  useEffect(() => {
    if (!simId || status !== 'running') return;
    const interval = setInterval(async () => {
      try {
        const data = await api.simulationLog(simId);
        setLogs(data.log || []);
        if (data.status === 'completed') setStatus('complete');
      } catch (_) {}
    }, 1500);
    return () => clearInterval(interval);
  }, [simId, status]);

  async function launch() {
    setStatus('running');
    setLogs([{ message: `Launching ${selected}...`, detail: '' }]);
    try {
      const result = await api.startSimulation(selected);
      setSimId(result.id);
      setLogs([{ message: `Simulation ${result.id} started`, detail: `Scenario: ${result.scenario_name}` }]);
    } catch (err) {
      setStatus('error');
      setLogs([{ message: 'Error', detail: err.message }]);
    }
  }

  if (!authed) return <Login onAuth={() => setAuthed(true)} />;

  return (
    <div className="console-app">
      <header className="console-header">
        <div>
          <h1 className="console-title">⚡ ATTACKER <span>CONSOLE</span></h1>
          <p className="muted">External threat simulation against target organization</p>
        </div>
        <div className="target-badge">TARGET → http://localhost:3000 (Crestwood College)</div>
      </header>

      <div className="status-bar">
        <span>STATUS:</span>
        <span style={{ color: status === 'complete' ? 'var(--accent-primary)' : status === 'error' ? 'var(--accent-alert)' : 'var(--accent-warning)' }}>{status.toUpperCase()}</span>
        {current && <span className="muted">→ {current.target}</span>}
        <button className="neu-btn primary" style={{ marginLeft: 'auto' }} onClick={launch} disabled={status === 'running'}>
          Launch {selected.replace(/_/g, ' ')}
        </button>
      </div>

      <div className="grid-2">
        <div className="neu-card">
          <p className="eyebrow">15 Attack Scenarios</p>
          <h3 style={{ marginBottom: 16 }}>Scenario Library</h3>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 8 }}>{cat}</div>
              <div className="scenario-grid">
                {items.map((s) => (
                  <button key={s.id} className={`scenario-card ${selected === s.id ? 'selected' : ''}`} onClick={() => setSelected(s.id)}>
                    <div className="cat">{s.category}</div>
                    <div className="name">{s.name}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="neu-card">
          <p className="eyebrow">Attacker's Eye View</p>
          <h3 style={{ marginBottom: 12 }}>Live HTTP Log</h3>
          <div className="terminal-log">
            {logs.length === 0 && <div className="log-line">Select a scenario and launch...</div>}
            {logs.map((entry, i) => (
              <div key={i} className="log-line">
                <span className="msg">[{entry.timestamp?.slice(11, 19) || '---'}]</span> {entry.message}
                {entry.detail && <div style={{ paddingLeft: 16, color: '#6a8a7a' }}>{entry.detail}</div>}
              </div>
            ))}
          </div>
          {status === 'complete' && (
            <p style={{ marginTop: 12, color: 'var(--accent-primary)' }}>
              Scenario complete — check Security Dashboard for detection (may take 1–2s)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
