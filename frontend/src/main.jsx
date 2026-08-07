import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { useState, useEffect } from 'react';
import App from './App';
import Login from './pages/Login';
import { getToken, api } from './api';
import './index.css';

function Root() {
  const [authed, setAuthed] = useState(!!getToken());

  useEffect(() => {
    if (getToken()) {
      api.me().then(() => setAuthed(true)).catch(() => setAuthed(false));
    }
  }, []);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
