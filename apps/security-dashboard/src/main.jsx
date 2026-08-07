import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import { api, getToken } from './api';
import './index.css';

function Root() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getToken()) {
      api.me().then(() => setAuthed(true)).catch(() => setAuthed(false)).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) return null;
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
