import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import { api, clearToken, getToken } from './api';
import './index.css';

function SessionLoader() {
  return (
    <main className="session-loader" role="status" aria-live="polite">
      <span className="loader-logo" aria-hidden="true">A</span>
      <span className="spinner" aria-hidden="true" />
      <p>Verifying defender session…</p>
    </main>
  );
}

function Root() {
  const [session, setSession] = useState({ status: getToken() ? 'checking' : 'out', user: null });

  useEffect(() => {
    let active = true;
    if (!getToken()) return undefined;
    api.me()
      .then((user) => active && setSession({ status: 'in', user }))
      .catch(() => {
        clearToken();
        if (active) setSession({ status: 'out', user: null });
      });
    return () => { active = false; };
  }, []);

  if (session.status === 'checking') return <SessionLoader />;
  if (session.status === 'out') return <Login onLogin={(user) => setSession({ status: 'in', user })} />;

  return (
    <BrowserRouter>
      <App
        user={session.user}
        onLogout={() => {
          clearToken();
          setSession({ status: 'out', user: null });
        }}
      />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><Root /></React.StrictMode>);
