import { useState } from 'react';
import { api } from '../api';

export default function Admissions() {
  const [form, setForm] = useState({ name: '', email: '', program: 'Computer Science', message: '' });
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.admission(form);
      setResult(res.message);
    } catch (err) {
      setResult(err.message);
    }
  }

  return (
    <div className="form-page">
      <div className="neu-card">
        <p className="eyebrow">Admissions</p>
        <h2>Apply to Crestwood College</h2>
        <p className="muted" style={{ marginBottom: 24 }}>Submit your inquiry and our admissions team will respond within 5 business days.</p>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="neu-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="neu-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Program of Interest</label>
            <select className="neu-input" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
              <option>Computer Science</option>
              <option>Business Administration</option>
              <option>Nursing</option>
              <option>Psychology</option>
            </select>
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea className="neu-input" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <button className="neu-btn primary" type="submit" style={{ width: '100%' }}>Submit Application</button>
        </form>
        {result && <p style={{ marginTop: 16, color: 'var(--accent-primary)' }}>{result}</p>}
      </div>
    </div>
  );
}
