import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';

export default function Admin({ user }) {
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [system, setSystem] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.adminStudents().then(setStudents).catch(() => {});
      api.adminDocuments().then(setDocuments).catch(() => {});
      api.systemStatus().then(setSystem).catch(() => {});
    }
  }, [user]);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/portal" />;

  async function viewDoc(id) {
    setPreview(await api.getDocument(id));
  }

  return (
    <div>
      <div className="neu-card" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Administration</p>
        <h2>IT & Academic Admin Panel</h2>
        <p className="muted">Manage students, internal documents, and system diagnostics</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['students', 'documents', 'system'].map((t) => (
          <button key={t} className={`neu-btn ${tab === t ? 'primary' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="neu-card">
          <h3 style={{ marginBottom: 16 }}>Student Roster</h3>
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Major</th><th>GPA</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.student_id}</code></td>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.major}</td>
                  <td>{s.gpa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'documents' && (
        <div className="neu-card">
          <h3 style={{ marginBottom: 8 }}>Internal Document Directory</h3>
          <p className="muted" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
            Real policy docs sit next to planted honeytoken files (Payroll, Salaries). They look identical to attackers.
          </p>
          {documents.map((d) => (
            <div key={d.id} className="doc-item">
              <div>
                <strong>{d.title}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>{d.file_path}</div>
              </div>
              <button className="neu-btn" onClick={() => viewDoc(d.id)}>Open</button>
            </div>
          ))}
          {preview && (
            <div className="doc-preview" style={{ marginTop: 16 }}>
              <strong>{preview.title}</strong>
              {'\n\n'}{preview.content}
            </div>
          )}
        </div>
      )}

      {tab === 'system' && system && (
        <div className="neu-card">
          <h3>System Status</h3>
          <p style={{ margin: '12px 0' }}>Status: <span className="badge badge-normal">{system.status}</span> · Uptime: {system.uptime}</p>
          <p className="muted">Services: {system.services?.join(', ')}</p>
          <p className="fake-hint" style={{ marginTop: 16 }}>
            Vulnerable endpoints (fetch, ping, config export) are targeted by the Attacker Console — not visible here as normal admin UI.
          </p>
        </div>
      )}

      <p style={{ marginTop: 24 }}><Link to="/portal">← Back to Portal</Link></p>
    </div>
  );
}
