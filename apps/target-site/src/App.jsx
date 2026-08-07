import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api';
import Home from './pages/Home';
import Admissions from './pages/Admissions';
import Login from './pages/Login';
import Portal from './pages/Portal';
import Courses from './pages/Courses';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

function Layout({ user, onLogout }) {
  return (
    <div>
      <header className="site-header">
        <Link to="/" className="site-logo">Crestwood <span>College</span></Link>
        <nav className="site-nav">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/admissions">Admissions</NavLink>
          {user ? (
            <>
              <NavLink to="/portal">My Portal</NavLink>
              {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
              <span className="muted" style={{ fontSize: '0.85rem' }}>{user.name}</span>
              <button className="neu-btn" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <NavLink to="/login">Student Login</NavLink>
          )}
        </nav>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        © 2026 Crestwood College · Excellence in Education
      </footer>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) {
      api.me().then(setUser).catch(() => setToken(''));
    }
  }, []);

  function onLogin() {
    api.me().then(setUser);
    navigate('/portal');
  }

  function onLogout() {
    setToken('');
    setUser(null);
    navigate('/');
  }

  return (
    <Routes>
      <Route element={<Layout user={user} onLogout={onLogout} />}>
        <Route index element={<Home />} />
        <Route path="admissions" element={<Admissions />} />
        <Route path="login" element={<Login onLogin={onLogin} />} />
        <Route path="portal" element={<Portal user={user} />} />
        <Route path="portal/courses" element={<Courses user={user} />} />
        <Route path="portal/profile" element={<Profile user={user} />} />
        <Route path="admin/*" element={<Admin user={user} />} />
      </Route>
    </Routes>
  );
}
