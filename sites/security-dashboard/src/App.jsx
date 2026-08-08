import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';

function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M16 4 26 10v12l-10 6L6 22V10l10-6Z" />
        <circle cx="16" cy="16" r="3" />
        <path d="M16 7v6m0 6v6M8 11l5.5 3m5 4L24 21m0-10-5.5 3m-5 4L8 21" />
      </svg>
    </span>
  );
}

export default function App({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const incidentView = location.pathname.startsWith('/incidents/');
  const initials = (user?.email || 'Security Operator')
    .split('@')[0]
    .split(/[._-]/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <button
        className={`nav-scrim ${menuOpen ? 'visible' : ''}`}
        type="button"
        aria-label="Close navigation"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} id="soc-navigation">
        <div className="brand"><Logo /><span><strong>Arachne<i>AI</i></strong><small>Defender console</small></span></div>
        <p className="nav-label">Security workspace</p>
        <nav aria-label="Security dashboard">
          <NavLink to="/" end>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" /></svg>
            <span><strong>Security overview</strong><small>Monitor and respond</small></span>
          </NavLink>
        </nav>

        <div className="sidebar-spacer" />
        <section className="protection-card" aria-label="Protection status">
          <span className="shield-icon" aria-hidden="true">✓</span>
          <div><strong>Defense mesh active</strong><small><i /> Backend connected</small></div>
        </section>

        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{initials || 'SO'}</span>
          <span><strong title={user?.email}>{user?.email || 'Security operator'}</strong><small>{user?.role || 'analyst'}</small></span>
          <button type="button" onClick={onLogout} aria-label="Sign out">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></svg>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="menu-button"
              type="button"
              aria-label="Open navigation"
              aria-controls="soc-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div><span>{incidentView ? 'Incident response' : 'Command center'}</span><h1>{incidentView ? 'Investigation workspace' : 'Security overview'}</h1></div>
          </div>
          <div className="topbar-actions">
            <span className="live-status"><i /> Live monitoring</span>
            <button className="signout-button" type="button" onClick={onLogout}>Sign out</button>
          </div>
        </header>

        <main className="main" id="main-content" tabIndex="-1">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
