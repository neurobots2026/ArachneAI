import { Link, Navigate } from 'react-router-dom';

export default function Portal({ user }) {
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="portal-grid">
      <aside className="portal-sidebar">
        <div className="neu-card">
          <p className="eyebrow">My Portal</p>
          <h3 style={{ marginBottom: 8 }}>{user.name}</h3>
          <p className="muted" style={{ fontSize: '0.85rem' }}>{user.student_id} · {user.major}</p>
          <p style={{ marginTop: 8 }}>GPA: <strong style={{ color: 'var(--accent-primary)' }}>{user.gpa}</strong></p>
        </div>
        <div className="neu-card">
          <Link to="/portal" className="active">Dashboard</Link>
          <Link to="/portal/courses">Courses</Link>
          <Link to="/portal/profile">Profile & Documents</Link>
        </div>
      </aside>
      <div>
        <div className="neu-card" style={{ marginBottom: 24 }}>
          <p className="eyebrow">Dashboard</p>
          <h2>Welcome back, {user.name.split(' ')[0]}</h2>
          <p className="muted">Spring 2026 semester · Registration open until March 15</p>
        </div>
        <div className="card-grid">
          <div className="neu-card">
            <div className="stat-value">{user.gpa}</div>
            <div className="stat-label">Current GPA</div>
          </div>
          <div className="neu-card">
            <div className="stat-value">12</div>
            <div className="stat-label">Credits This Term</div>
          </div>
          <div className="neu-card">
            <div className="stat-value">$4,200</div>
            <div className="stat-label">Tuition Balance</div>
          </div>
        </div>
        <div className="neu-card">
          <h3 style={{ marginBottom: 12 }}>Quick Links</h3>
          <Link to="/portal/courses" className="neu-btn" style={{ marginRight: 8 }}>Browse Courses</Link>
          <Link to="/portal/profile" className="neu-btn">View Documents</Link>
        </div>
      </div>
    </div>
  );
}
