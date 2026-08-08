import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import { api, clearToken, getToken } from './api';
import './index.css';

function LoadingScreen() {
  return (
    <main className="auth-loading" aria-live="polite" aria-busy="true">
      <div className="auth-loading-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="M16 4 26 10v12l-10 6L6 22V10l10-6Z" />
          <circle cx="16" cy="16" r="3" />
          <path d="M16 7v6m0 6v6M8 11l5.5 3m5 4L24 21m0-10-5.5 3m-5 4L8 21" />
        </svg>
      </div>
      <div className="auth-loading-spinner" aria-hidden="true" />
      <p>Verifying secure session…</p>
    </main>
  );
}

function Root() {
  const [session, setSession] = useState(() => ({
    status: getToken() ? 'checking' : 'signed-out',
    user: null,
  }));

  useEffect(() => {
    let active = true;

    if (!getToken()) return undefined;

    api.me()
      .then((user) => {
        if (active) setSession({ status: 'signed-in', user });
      })
      .catch(() => {
        clearToken();
        if (active) setSession({ status: 'signed-out', user: null });
      });

    return () => {
      active = false;
    };
  }, []);

  function handleLogin(user) {
    setSession({ status: 'signed-in', user });
  }

  function handleLogout() {
    clearToken();
    setSession({ status: 'signed-out', user: null });
  }

  if (session.status === 'checking') return <LoadingScreen />;
  if (session.status === 'signed-out') return <Login onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <App user={session.user} onLogout={handleLogout} />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
