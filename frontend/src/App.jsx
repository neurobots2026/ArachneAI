import { NavLink, Outlet, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CompanyExplorer from './pages/CompanyExplorer';
import IncidentDetail from './pages/IncidentDetail';
import AttackerConsole from './pages/AttackerConsole';

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>🕸 ArachneAI</h1>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/explorer">Company Explorer</NavLink>
          <NavLink to="/attacker">Attacker Console</NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="explorer" element={<CompanyExplorer />} />
          <Route path="attacker" element={<AttackerConsole />} />
          <Route path="incidents/:id" element={<IncidentDetail />} />
        </Routes>
      </main>
    </div>
  );
}
