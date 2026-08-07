import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';

export default function Courses({ user }) {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { api.courses().then(setCourses).catch(() => {}); }, []);

  if (!user) return <Navigate to="/login" />;

  async function enroll(id) {
    try {
      await api.enroll(id);
      setMsg('Enrolled successfully!');
      api.courses().then(setCourses);
    } catch (err) { setMsg(err.message); }
  }

  async function openCourse(c) {
    setSelected(c);
    setReviews(await api.reviews(c.id).catch(() => []));
  }

  async function submitReview() {
    if (!selected || !reviewText) return;
    await api.postReview(selected.id, reviewText);
    setReviewText('');
    setReviews(await api.reviews(selected.id));
    setMsg('Review posted');
  }

  return (
    <div className="portal-grid">
      <aside className="portal-sidebar">
        <div className="neu-card">
          <Link to="/portal">← Dashboard</Link>
          <Link to="/portal/courses" className="active">Courses</Link>
          <Link to="/portal/profile">Profile</Link>
        </div>
      </aside>
      <div>
        <h2 style={{ marginBottom: 16 }}>Course Catalog</h2>
        {msg && <p style={{ color: 'var(--accent-primary)', marginBottom: 12 }}>{msg}</p>}
        <div className="content-grid">
          {courses.map((c) => (
            <div key={c.id} className="program-card" style={{ cursor: 'pointer' }} onClick={() => openCourse(c)}>
              <h3>{c.code}</h3>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>{c.title}</p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>{c.description.slice(0, 100)}...</p>
              <p style={{ marginTop: 8, fontSize: '0.85rem' }}>{c.instructor} · {c.schedule}</p>
              {c.enrolled ? (
                <span className="badge badge-normal">Enrolled · {c.grade}</span>
              ) : (
                <button className="neu-btn primary" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); enroll(c.id); }}>Enroll</button>
              )}
            </div>
          ))}
        </div>

        {selected && (
          <div className="neu-card" style={{ marginTop: 24 }}>
            <h3>{selected.code}: {selected.title}</h3>
            <p className="muted" style={{ margin: '12px 0' }}>{selected.description}</p>
            <h4 style={{ marginBottom: 8 }}>Course Reviews</h4>
            {reviews.map((r) => (
              <div key={r.id} className="review-box">
                <div className="author">{r.user_name}</div>
                <div dangerouslySetInnerHTML={{ __html: r.content }} />
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <textarea className="neu-input" rows={3} placeholder="Write a review..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
              <button className="neu-btn primary" style={{ marginTop: 8 }} onClick={submitReview}>Post Review</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
