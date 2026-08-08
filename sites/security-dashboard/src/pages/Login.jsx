import { useState } from 'react';
import { api, clearToken, setToken } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('secops@crestwood.edu');
  const [password, setPassword] = useState('secops123');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.login(email.trim(), password);
      setToken(result.access_token);
      const user = await api.me();
      onLogin(user);
    } catch (loginError) {
      clearToken();
      setError(loginError.message || 'Unable to access the defender console.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-grid" aria-hidden="true" />
        <div className="login-story-content">
          <div className="login-brand"><span>A</span><div><strong>Arachne<i>AI</i></strong><small>Defender console</small></div></div>
          <div className="story-copy">
            <p className="eyebrow">Deception-led defense</p>
            <h1>See the threat.<br />Control the response.</h1>
            <p>Monitor normal traffic, catch honeytoken interaction, follow autonomous investigation, and authorize containment from one calm workspace.</p>
          </div>
          <div className="story-status"><i /><span><strong>Protection online</strong><small>Crestwood College · live telemetry</small></span><b>24/7</b></div>
        </div>
      </section>

      <section className="login-form-panel" aria-labelledby="login-title">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-login-brand">Arachne<span>AI</span></div>
          <p className="eyebrow">Authorized access</p>
          <h2 id="login-title">Welcome back</h2>
          <p className="login-intro">Sign in to your security operations workspace.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <label htmlFor="email">Work email</label>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3V6Zm0 1 9 6 9-6" /></svg>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} required />
          </div>
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <button className="login-button" type="submit" disabled={busy}>{busy ? <><span className="spinner" /> Verifying…</> : <>Open defender console <span>→</span></>}</button>
          <div className="demo-note"><strong>Demo credentials prefilled</strong><span>Use the seeded SecOps account to enter.</span></div>
          <p className="secure-note">Encrypted session · Authorized personnel only</p>
        </form>
      </section>
    </main>
  );
}
