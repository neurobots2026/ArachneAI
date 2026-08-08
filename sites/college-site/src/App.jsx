import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, getToken, setToken } from './api';
import { LoadingPanel, ScrollToTop, SiteFooter, SiteHeader } from './components/SiteChrome';
import Home from './pages/Home';
import {
  AboutPage,
  AcademicsPage,
  AdmissionsPage,
  CampusLifePage,
  DeveloperResourcesPage,
  FacultyPage,
  NotFoundPage,
} from './pages/PublicPages';
import AuthPage from './pages/AuthPage';
import {
  PortalAssignments,
  PortalCourses,
  PortalDashboard,
  PortalFinancialAid,
  PortalProfile,
  PortalResources,
} from './pages/PortalPages';
import AdminPage from './pages/AdminPage';

function ProtectedPage({ user, sessionLoading, admin = false, children }) {
  if (sessionLoading) {
    return <main className="session-loading" id="main-content"><LoadingPanel message="Opening My Crestwood…" /></main>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/portal/dashboard" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const location = useLocation();

  const refreshSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setSessionLoading(false);
      return null;
    }
    try {
      const nextUser = await api.me();
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      setToken('');
      setUser(null);
      throw error;
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession().catch(() => {});
  }, [refreshSession]);

  async function authenticate(accessToken) {
    setToken(accessToken);
    setSessionLoading(true);
    return refreshSession();
  }

  async function logout() {
    try {
      await api.logout();
    } catch (_) {
      // Local sign-out must still complete if the acknowledgement endpoint is offline.
    } finally {
      setToken('');
      setUser(null);
    }
  }

  const applicationRoute = location.pathname.startsWith('/portal/')
    || location.pathname === '/admin'
    || location.pathname === '/login'
    || location.pathname === '/register';

  return (
    <div className="site-app">
      <ScrollToTop />
      <SiteHeader user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/academics" element={<AcademicsPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/campus-life" element={<CampusLifePage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/developer-resources" element={<DeveloperResourcesPage />} />
        <Route path="/login" element={<AuthPage user={user} onAuthenticated={authenticate} initialMode="login" />} />
        <Route path="/register" element={<AuthPage user={user} onAuthenticated={authenticate} initialMode="register" />} />

        <Route path="/portal/dashboard" element={<ProtectedPage user={user} sessionLoading={sessionLoading}><PortalDashboard user={user} /></ProtectedPage>} />
        <Route path="/portal/courses" element={<ProtectedPage user={user} sessionLoading={sessionLoading}><PortalCourses user={user} /></ProtectedPage>} />
        <Route path="/portal/resources" element={<ProtectedPage user={user} sessionLoading={sessionLoading}><PortalResources user={user} /></ProtectedPage>} />
        <Route path="/portal/assignments" element={<ProtectedPage user={user} sessionLoading={sessionLoading}><PortalAssignments user={user} /></ProtectedPage>} />
        <Route path="/portal/financial-aid" element={<ProtectedPage user={user} sessionLoading={sessionLoading}><PortalFinancialAid user={user} /></ProtectedPage>} />
        <Route path="/portal/profile" element={<ProtectedPage user={user} sessionLoading={sessionLoading}><PortalProfile user={user} onUserUpdate={setUser} /></ProtectedPage>} />
        <Route path="/admin" element={<ProtectedPage user={user} sessionLoading={sessionLoading} admin><AdminPage user={user} /></ProtectedPage>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!applicationRoute && <SiteFooter />}
    </div>
  );
}
