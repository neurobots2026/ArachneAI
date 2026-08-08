import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { programCatalog } from '../content';
import { CrestwoodMark, InlineStatus } from '../components/SiteChrome';

export default function AuthPage({ user, onAuthenticated, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    major: 'Undeclared',
  });
  const tabRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    setMode(initialMode);
    setStatus({ state: 'idle', message: '' });
  }, [initialMode]);

  if (user) return <Navigate to="/portal/dashboard" replace />;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setStatus({ state: 'idle', message: '' });
  }

  function handleTabKeyDown(event, currentMode) {
    const tabs = ['login', 'register'];
    const currentIndex = tabs.indexOf(currentMode);
    let nextIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextMode = tabs[nextIndex];
    changeMode(nextMode);
    tabRefs.current[nextMode]?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ state: 'submitting', message: '' });
    try {
      const result = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.register({
            name: form.name,
            email: form.email,
            password: form.password,
            major: form.major === 'Undeclared' ? 'Undeclared' : form.major,
          });
      await onAuthenticated(result.access_token);
      navigate('/portal/dashboard', { replace: true });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-page__story">
        <div className="auth-page__story-copy">
          <p className="eyebrow eyebrow--light">My Crestwood</p>
          <h1>Your campus, gathered in one place.</h1>
          <p>Courses, resources, academic planning, and the everyday details that help you move forward.</p>
        </div>
        <blockquote>
          <span>“</span>
          The portal keeps my schedule and course resources simple, so I can spend more time on the work itself.
          <cite>Alex Rivera ’27</cite>
        </blockquote>
      </div>

      <div className="auth-page__form-wrap">
        <div className="auth-card">
          <div className="auth-card__brand"><CrestwoodMark compact /><span>My Crestwood</span></div>
          <div className="auth-tabs" role="tablist" aria-label="Account access" aria-orientation="horizontal">
            <button
              ref={(element) => { tabRefs.current.login = element; }}
              id="auth-tab-login"
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              aria-controls="auth-panel-login"
              tabIndex={mode === 'login' ? 0 : -1}
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => changeMode('login')}
              onKeyDown={(event) => handleTabKeyDown(event, 'login')}
            >
              Sign in
            </button>
            <button
              ref={(element) => { tabRefs.current.register = element; }}
              id="auth-tab-register"
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              aria-controls="auth-panel-register"
              tabIndex={mode === 'register' ? 0 : -1}
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => changeMode('register')}
              onKeyDown={(event) => handleTabKeyDown(event, 'register')}
            >
              Create account
            </button>
          </div>

          {['login', 'register'].map((panelMode) => (
            <div
              key={panelMode}
              id={`auth-panel-${panelMode}`}
              role="tabpanel"
              aria-labelledby={`auth-tab-${panelMode}`}
              tabIndex={mode === panelMode ? 0 : -1}
              hidden={mode !== panelMode}
            >
              {mode === panelMode && (
                <>
                  <div className="auth-card__heading">
                    <h2>{mode === 'login' ? 'Welcome back' : 'Join the Crestwood community'}</h2>
                    <p>{mode === 'login' ? 'Use your college account to continue.' : 'Create a student portal account to get started.'}</p>
                  </div>

                  <form className="auth-form" onSubmit={submit}>
                    {mode === 'register' && (
                      <>
                        <label>Full name<input required autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
                        <label>
                          Intended major
                          <select value={form.major} onChange={(event) => update('major', event.target.value)}>
                            <option>Undeclared</option>
                            {programCatalog.map((program) => <option key={program.name}>{program.name}</option>)}
                          </select>
                        </label>
                      </>
                    )}
                    <label>
                      College email
                      <input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@crestwood.edu" />
                    </label>
                    <label>
                      Password
                      <span className="password-field">
                        <input required type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(event) => update('password', event.target.value)} />
                        <button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? 'Hide' : 'Show'}</button>
                      </span>
                    </label>
                    {mode === 'login' && <a className="auth-form__help" href="mailto:help@crestwood.edu?subject=Portal%20password%20help">Forgot your password?</a>}
                    {status.state === 'error' && <InlineStatus tone="error">{status.message}</InlineStatus>}
                    <button className="button button--wide" type="submit" disabled={status.state === 'submitting'}>
                      {status.state === 'submitting' ? 'Please wait…' : mode === 'login' ? 'Sign in to My Crestwood' : 'Create my account'}
                    </button>
                  </form>

                  <p className="auth-card__support">Need help? <a href="mailto:help@crestwood.edu">Contact the IT Service Desk</a>.</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
