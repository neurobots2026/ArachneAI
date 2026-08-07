import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Home() {
  const [news, setNews] = useState([]);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    api.news().then(setNews).catch(() => {});
    api.programs().then(setPrograms).catch(() => {});
  }, []);

  return (
    <div>
      <section className="hero">
        <p className="eyebrow">Welcome to Crestwood</p>
        <h1>Where Innovation Meets Tradition</h1>
        <p>Join 4,200 students across 40+ programs. Apply today for Fall 2026 enrollment.</p>
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link to="/admissions" className="neu-btn primary">Apply Now</Link>
          <Link to="/login" className="neu-btn">Student Portal</Link>
        </div>
      </section>

      <h2 style={{ marginBottom: 16 }}>Academic Programs</h2>
      <div className="content-grid" style={{ marginBottom: 32 }}>
        {programs.map((p) => (
          <div key={p.name} className="program-card">
            <h3>{p.name}</h3>
            <p className="muted">{p.description}</p>
            <span className="real-badge">{p.duration}</span>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: 16 }}>Campus News</h2>
      <div className="content-grid">
        {news.map((n) => (
          <div key={n.title} className="news-card">
            <h3>{n.title}</h3>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 8 }}>{n.date}</p>
            <p>{n.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
