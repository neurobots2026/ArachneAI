import { useState } from 'react';
import { api, clearToken, setToken } from '../api';

function LoginBrand() {
  return (
    <div className="login-brand">
      <span className="login-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="M16 4 26 10v12l-10 6L6 22V10l10-6Z" />
          <circle cx="16" cy="16" r="3" />
          <path d="M16 7v6m0 6v6M8 11l5.5 3m5 4L24 21m0-10-5.5 3m-5 4L8 21" />
        </svg>
      </span>
      <span>
        <strong>Arachne<span>AI</span></strong>
        <small>Autonomous defense platform</small>
      </span>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('secops@crestwood.edu');
  const [password, setPassword] = useState('secops123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);

    try {
      const { access_token: accessToken } = await api.login(email.trim(), password);
      setToken(accessToken);
      const user = await api.me();
      onLogin(user);
    } catch (err) {
      clearToken();
      setError(err.message || 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="ArachneAI platform introduction">
        <div className="login-visual-grid" aria-hidden="true" />
        <div className="login-visual-content">
          <LoginBrand />
          <div className="login-hero-copy">
            <p className="login-eyebrow">Threat deception, reimagined</p>
            <h1>Turn every intrusion into intelligence.</h1>
            <p>
              Deploy adaptive deception, detect adversaries in real time, and coordinate
              incident response from one focused command center.
            </p>
          </div>
          <div className="login-signal-card">
            <span className="signal-pulse" aria-hidden="true"><i /></span>
            <span>
              <strong>Defense mesh active</strong>
              <small>Continuous telemetry across protected assets</small>
            </span>
            <span className="signal-value">99.9%</span>
          </div>
          <p className="login-copyright">© 2026 ArachneAI Security Labs</p>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-inner">
          <div className="login-mobile-brand"><LoginBrand /></div>
          <div className="login-heading">
            <p className="login-eyebrow">Protected workspace</p>
            <h2 id="login-title">Welcome back</h2>
            <p>Sign in to access your security operations console.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error" role="alert">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3h.01" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Work email</label>
              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 6h18v12H3V6Zm0 1 9 6 9-6" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
                <span>Secure access</span>
              </div>
              <div className="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={submitting}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  disabled={submitting}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15.6 15.6 0 0 1-2.1 3M6.6 6.6C4.2 8.2 3 12 3 12s3.5 7 9 7a9.7 9.7 0 0 0 3-.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Verifying access…
                </>
              ) : (
                <>
                  Access command center
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="demo-access">
            <div>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 4.5 6v5c0 4.8 3.2 8.1 7.5 10 4.3-1.9 7.5-5.2 7.5-10V6L12 3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>
                <strong>Demo workspace ready</strong>
                <small>Credentials are prefilled for the hackathon demo.</small>
              </span>
            </div>
          </div>

          <p className="login-support">Authorized personnel only · Encrypted session</p>
        </div>
      </section>
    </main>
  );
}
