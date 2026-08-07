import { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('secops@crestwood.edu');
  const [password, setPassword] = useState('secops123');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      onLogin();
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="login-page">
      <form className="neu-card login-box" onSubmit={handleSubmit}>
        <p className="eyebrow">Security Dashboard</p>
        <h2>ArachneAI SOC</h2>
        <p className="muted" style={{ marginBottom: 16 }}>Monitor Crestwood College — normal traffic, attacks, and post-incident response.</p>
        {error && <p style={{ color: 'var(--accent-alert)', marginBottom: 12 }}>{error}</p>}
        <input className="neu-input" style={{ marginBottom: 12 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="neu-input" style={{ marginBottom: 12 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button className="neu-btn primary" type="submit" style={{ width: '100%' }}>Sign In</button>
      </form>
    </div>
  );
}
