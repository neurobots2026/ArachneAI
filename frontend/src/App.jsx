import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import IncidentDetail from './pages/IncidentDetail';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Security overview',
    shortLabel: 'Overview',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" />
      </svg>
    ),
  },
];

const PAGE_DETAILS = {
  '/': {
    eyebrow: 'Command center',
    title: 'Security overview',
  },
};

function BrandMark() {
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

function formatRole(role) {
  if (!role) return 'Security operator';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function App({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isIncident = location.pathname.startsWith('/incidents/');
  const page = isIncident
    ? { eyebrow: 'Incident response', title: 'Incident investigation' }
    : PAGE_DETAILS[location.pathname] || PAGE_DETAILS['/'];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const email = user?.email || 'Security operator';
  const initials = email
    .split('@')[0]
    .split(/[._-]/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SO';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <button
        className={`mobile-overlay ${menuOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label="Close navigation"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} id="primary-navigation">
        <div className="sidebar-brand">
          <BrandMark />
          <div>
            <strong>Arachne<span>AI</span></strong>
            <small>Autonomous defense</small>
          </div>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>
                <strong>{item.shortLabel}</strong>
                <small>{item.label}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-card">
            <span className="system-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3 4.5 6v5c0 4.8 3.2 8.1 7.5 10 4.3-1.9 7.5-5.2 7.5-10V6L12 3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span>
              <strong>Protection active</strong>
              <small><i /> All systems operational</small>
            </span>
          </div>

          <div className="sidebar-user">
            <span className="user-avatar" aria-hidden="true">{initials}</span>
            <span className="user-details">
              <strong title={email}>{email}</strong>
              <small>{formatRole(user?.role)}</small>
            </span>
            <button className="logout-button" type="button" onClick={onLogout} aria-label="Sign out">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-heading">
            <button
              className="mobile-menu-button"
              type="button"
              aria-controls="primary-navigation"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div>
              <span>{page.eyebrow}</span>
              <h1>{page.title}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-status" role="status">
              <i />
              <span>Live monitoring</span>
            </div>
            <div className="topbar-user" title={email}>
              <span className="user-avatar" aria-hidden="true">{initials}</span>
              <span>
                <strong>{email}</strong>
                <small>{formatRole(user?.role)}</small>
              </span>
            </div>
            <button className="topbar-logout" type="button" onClick={onLogout}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
              </svg>
              <span>Sign out</span>
            </button>
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
