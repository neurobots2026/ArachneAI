import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';

export default function Profile({ user }) {
  const [docs, setDocs] = useState([]);
  const [preview, setPreview] = useState(null);
  const [major, setMajor] = useState(user?.major || '');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) api.documents().then(setDocs).catch(() => {});
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  async function viewDoc(id) {
    const doc = await api.getDocument(id);
    setPreview(doc);
  }

  async function saveProfile() {
    try {
      await api.updateProfile({ major });
      setMsg('Profile updated');
    } catch (err) { setMsg(err.message); }
  }

  return (
    <div className="portal-grid">
      <aside className="portal-sidebar">
        <div className="neu-card">
          <Link to="/portal">← Dashboard</Link>
          <Link to="/portal/courses">Courses</Link>
          <Link to="/portal/profile" className="active">Profile</Link>
        </div>
      </aside>
      <div>
        <h2 style={{ marginBottom: 16 }}>Profile & Documents</h2>
        <div className="grid-2">
          <div className="neu-card">
            <p className="eyebrow">Real Content</p>
            <h3>Your Profile</h3>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Name</label>
              <input className="neu-input" value={user.name} disabled />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="neu-input" value={user.email} disabled />
            </div>
            <div className="form-group">
              <label>Major</label>
              <input className="neu-input" value={major} onChange={(e) => setMajor(e.target.value)} />
            </div>
            <button className="neu-btn primary" onClick={saveProfile}>Save Changes</button>
            {msg && <p style={{ marginTop: 12, color: 'var(--accent-primary)' }}>{msg}</p>}
          </div>
          <div className="neu-card">
            <p className="eyebrow">Documents</p>
            <h3>Available Files</h3>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
              Real institutional documents appear alongside linked services. Attackers may retrieve fake bait files that look identical.
            </p>
            {docs.map((d) => (
              <div key={d.id} className="doc-item">
                <div>
                  <strong>{d.title}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>{d.file_path}</div>
                </div>
                <button className="neu-btn" onClick={() => viewDoc(d.id)}>View</button>
              </div>
            ))}
          </div>
        </div>
        {preview && (
          <div className="neu-card" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3>{preview.title}</h3>
              <button className="neu-btn" onClick={() => setPreview(null)}>Close</button>
            </div>
            <p className="muted" style={{ marginBottom: 8 }}>{preview.file_path}</p>
            <div className="doc-preview">{preview.content}</div>
            {preview.content?.includes('HONEYTOKEN') || preview.content?.includes('AKIA') ? (
              <p className="fake-hint" style={{ marginTop: 12 }}>⚠ This is deceptive bait content — what an attacker would steal. Real students see the same UI but defenders know it is fake.</p>
            ) : (
              <p className="real-badge" style={{ marginTop: 12 }}>✓ Authentic institutional document</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
