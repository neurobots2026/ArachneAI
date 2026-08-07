import { NavLink, Outlet, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CompanyExplorer from './pages/CompanyExplorer';
import IncidentDetail from './pages/IncidentDetail';

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>🕸 Arachne<span>AI</span></h1>
        <p className="tagline">Security Operations Center</p>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/explorer">Deception Explorer</NavLink>
        </nav>
        <div className="app-links">
          <strong>Related Apps</strong>
          <a href={`${window.location.protocol}//${window.location.hostname}:3000`} target="_blank" rel="noreferrer">→ Crestwood College (Target)</a>
          <a href={`${window.location.protocol}//${window.location.hostname}:3001`} target="_blank" rel="noreferrer">→ Attacker Console</a>
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route element={<Outlet />}>
            <Route index element={<Dashboard />} />
            <Route path="explorer" element={<CompanyExplorer />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
