import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { assignmentCatalog, portalAnnouncements, programCatalog } from '../content';
import { InlineStatus, LoadingPanel } from '../components/SiteChrome';
import PortalLayout from '../components/PortalLayout';

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PortalDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [announcements, setAnnouncements] = useState(portalAnnouncements);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const dashboard = await api.portalDashboard();
      setCourses(dashboard.courses || []);
      setDocuments(dashboard.documents || []);
      if (dashboard.notices?.length) setAnnouncements(dashboard.notices);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const enrolled = courses.filter((course) => course.enrolled);
  const firstName = user.name.split(' ')[0];

  return (
    <PortalLayout user={user} eyebrow="Student overview" title={`Welcome back, ${firstName}.`} intro="Here is what is happening across your Crestwood account.">
      {error && <InlineStatus tone="warning" onRetry={load}>{error}</InlineStatus>}
      {loading ? <LoadingPanel message="Preparing your student overview…" /> : (
        <>
          <section className="portal-metric-grid" aria-label="Academic summary">
            <article><span>Current GPA</span><strong>{Number(user.gpa).toFixed(2)}</strong><small>Good academic standing</small></article>
            <article><span>Enrolled courses</span><strong>{enrolled.length}</strong><small>{enrolled.reduce((total, course) => total + course.credits, 0)} active credits</small></article>
            <article><span>Program</span><strong className="portal-metric-grid__text">{user.major}</strong><small>{user.student_id}</small></article>
            <article><span>Available resources</span><strong>{documents.length}</strong><small>Documents in your library</small></article>
          </section>

          <div className="portal-dashboard-grid">
            <section className="portal-panel portal-panel--wide">
              <header><div><p className="eyebrow">This week</p><h2>Course schedule</h2></div><Link to="/portal/courses">View all courses →</Link></header>
              {enrolled.length ? (
                <div className="schedule-list">
                  {enrolled.slice(0, 4).map((course) => (
                    <article key={course.id}>
                      <span className="course-code">{course.code}</span>
                      <div><h3>{course.title}</h3><p>{course.instructor}</p></div>
                      <strong>{course.schedule}</strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="portal-empty"><h3>No courses on your schedule yet</h3><p>Browse the catalog to select a course.</p><Link className="button button--small" to="/portal/courses">Browse courses</Link></div>
              )}
            </section>

            <aside className="portal-panel announcement-panel">
              <header><div><p className="eyebrow">Campus notices</p><h2>Announcements</h2></div></header>
              <ul>{announcements.map((announcement, index) => <li key={announcement}><span>{index + 1}</span><p>{announcement}</p></li>)}</ul>
            </aside>

            <section className="portal-panel portal-panel--wide">
              <header><div><p className="eyebrow">Coming up</p><h2>Assignments & deadlines</h2></div><Link to="/portal/assignments">Open assignments →</Link></header>
              <div className="deadline-list">
                {assignmentCatalog.map((assignment) => <article key={assignment.title}><span>{assignment.course}</span><strong>{assignment.title}</strong><time>{assignment.due}</time><small className={`portal-status portal-status--${assignment.status.toLowerCase()}`}>{assignment.status}</small></article>)}
              </div>
            </section>

            <aside className="portal-panel quick-links-panel">
              <header><div><p className="eyebrow">Shortcuts</p><h2>Quick links</h2></div></header>
              <Link to="/portal/resources"><span aria-hidden="true">RS</span><div><strong>Course resources</strong><small>Documents and policies</small></div><i aria-hidden="true">→</i></Link>
              <Link to="/portal/financial-aid"><span aria-hidden="true">FA</span><div><strong>Financial aid</strong><small>Award and account overview</small></div><i aria-hidden="true">→</i></Link>
              <Link to="/portal/profile"><span aria-hidden="true">PR</span><div><strong>Update profile</strong><small>Contact and program details</small></div><i aria-hidden="true">→</i></Link>
            </aside>
          </div>
        </>
      )}
    </PortalLayout>
  );
}

export function PortalCourses({ user }) {
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');

  async function loadCourses() {
    setLoading(true);
    setError('');
    try {
      const nextCourses = await api.courses();
      setCourses(nextCourses);
      setSelectedId((current) => current || nextCourses[0]?.id || '');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCourses(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setReviewsLoading(true);
    api.reviews(selectedId)
      .then((items) => { if (active) setReviews(items); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setReviewsLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const selected = courses.find((course) => course.id === selectedId);

  async function enroll() {
    if (!selected) return;
    setAction('enrolling');
    setError('');
    try {
      await api.enroll(selected.id);
      await loadCourses();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAction('');
    }
  }

  async function postReview(event) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setAction('reviewing');
    setError('');
    try {
      await api.review(selected.id, comment);
      setComment('');
      setReviews(await api.reviews(selected.id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAction('');
    }
  }

  return (
    <PortalLayout user={user} eyebrow="Academic planning" title="Course catalog" intro="Review course details, manage enrollment, and join course discussions.">
      {error && <InlineStatus tone="error" onRetry={loadCourses}>{error}</InlineStatus>}
      {loading ? <LoadingPanel message="Loading the course catalog…" /> : (
        <div className="course-browser">
          <aside className="course-browser__list">
            <div className="course-browser__list-heading"><strong>{courses.length} courses</strong><span>2026 catalog</span></div>
            {courses.map((course) => (
              <button key={course.id} type="button" className={selectedId === course.id ? 'course-selector is-selected' : 'course-selector'} onClick={() => setSelectedId(course.id)}>
                <span>{course.code} · {course.credits} credits</span><strong>{course.title}</strong><small>{course.instructor}</small>{course.enrolled && <i>Enrolled</i>}
              </button>
            ))}
          </aside>

          {selected ? (
            <div className="course-browser__detail">
              <section className="course-detail-card">
                <div className="course-detail-card__meta"><span>{selected.code}</span><span>{selected.credits} credits</span><span>{selected.schedule}</span></div>
                <h2>{selected.title}</h2><p>{selected.description}</p>
                <dl><div><dt>Instructor</dt><dd>{selected.instructor}</dd></div><div><dt>Enrollment</dt><dd>{selected.enrolled ? 'Currently enrolled' : 'Open to eligible students'}</dd></div>{selected.grade && <div><dt>Current grade</dt><dd>{selected.grade}</dd></div>}</dl>
                {!selected.enrolled && <button className="button" type="button" onClick={enroll} disabled={action === 'enrolling'}>{action === 'enrolling' ? 'Enrolling…' : 'Enroll in this course'}</button>}
              </section>

              <section className="discussion-panel">
                <header><div><p className="eyebrow">Student perspectives</p><h2>Course discussion</h2></div><span>{reviews.length} posts</span></header>
                <form onSubmit={postReview}>
                  <label htmlFor="course-review">Share a course review</label>
                  <textarea id="course-review" required value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What should other students know about this course?" />
                  <button className="button button--small" type="submit" disabled={action === 'reviewing'}>{action === 'reviewing' ? 'Posting…' : 'Post review'}</button>
                </form>
                {reviewsLoading ? <LoadingPanel message="Loading discussion…" /> : (
                  reviews.length ? <div className="review-list">{reviews.map((review) => (
                    <article key={review.id}>
                      <div className="review-list__avatar" aria-hidden="true">{review.user_name?.[0] || 'C'}</div>
                      <div><header><strong>{review.user_name}</strong><time dateTime={review.created_at}>{formatDate(review.created_at)}</time></header>
                        {/* Review text remains inert; the simulator uses the backend's controlled render beacon. */}
                        <p>{review.content}</p>
                      </div>
                    </article>
                  ))}</div> : <div className="portal-empty portal-empty--compact"><h3>No discussion yet</h3><p>Be the first student to share a thoughtful review.</p></div>
                )}
              </section>
            </div>
          ) : <div className="portal-empty"><h2>No course selected</h2></div>}
        </div>
      )}
    </PortalLayout>
  );
}

export function PortalProfile({ user, onUserUpdate }) {
  const [form, setForm] = useState({ email: user.email, major: user.major });
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  async function save(event) {
    event.preventDefault();
    setStatus({ state: 'saving', message: '' });
    try {
      const updated = await api.updateProfile(form);
      onUserUpdate(updated);
      setStatus({ state: 'success', message: 'Your profile has been updated.' });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <PortalLayout user={user} eyebrow="Account" title="Profile & preferences" intro="Keep your contact and academic program information current.">
      <div className="profile-layout">
        <aside className="identity-card"><span className="identity-card__avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><h2>{user.name}</h2><p>{user.student_id}</p><dl><div><dt>Account type</dt><dd>{user.role === 'admin' ? 'Staff administrator' : 'Student'}</dd></div><div><dt>Academic standing</dt><dd>Good standing</dd></div><div><dt>Current GPA</dt><dd>{Number(user.gpa).toFixed(2)}</dd></div></dl></aside>
        <form className="portal-form" onSubmit={save}>
          <div><p className="eyebrow">Personal information</p><h2>Portal profile</h2><p>Changes are reflected across Crestwood student services.</p></div>
          <label>Full name<input value={user.name} disabled /><small>Contact the Registrar to update your legal name.</small></label>
          <label>College email<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Academic program<select value={form.major} onChange={(event) => setForm((current) => ({ ...current, major: event.target.value }))}><option>Undeclared</option>{programCatalog.map((program) => <option key={program.name}>{program.name}</option>)}</select></label>
          {status.state === 'error' && <InlineStatus tone="error">{status.message}</InlineStatus>}
          {status.state === 'success' && <InlineStatus tone="success">{status.message}</InlineStatus>}
          <button className="button" type="submit" disabled={status.state === 'saving'}>{status.state === 'saving' ? 'Saving changes…' : 'Save changes'}</button>
        </form>
      </div>
    </PortalLayout>
  );
}

export function PortalResources({ user }) {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState('');
  const [error, setError] = useState('');
  const viewerRef = useRef(null);

  async function load() {
    setLoading(true); setError('');
    try { setDocuments(await api.documents()); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected || !window.matchMedia('(max-width: 520px)').matches) return undefined;

    const frame = window.requestAnimationFrame(() => {
      viewerRef.current?.focus({ preventScroll: true });
      viewerRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  async function openDocument(document) {
    setOpening(document.id); setError('');
    try { setSelected(await api.document(document.id)); }
    catch (requestError) { setError(requestError.message); }
    finally { setOpening(''); }
  }

  return (
    <PortalLayout user={user} eyebrow="Student library" title="Documents & resources" intro="Access academic policies, course information, and files shared with your account.">
      {error && <InlineStatus tone="error" onRetry={load}>{error}</InlineStatus>}
      {loading ? <LoadingPanel message="Loading your resource library…" /> : (
        <div className="resource-layout">
          <section className="resource-library">
            <div className="resource-library__toolbar"><strong>{documents.length} available documents</strong><button className="text-action" type="button" onClick={load}>Refresh</button></div>
            {documents.length ? <div className="document-grid">{documents.map((document) => (
              <article className="document-card" key={document.id}>
                <span className="document-card__icon" aria-hidden="true">DOC</span><div><p>{document.category || 'General'}</p><h2>{document.title}</h2><small>Added {formatDate(document.created_at)}</small></div><button type="button" onClick={() => openDocument(document)} disabled={opening === document.id}>{opening === document.id ? 'Opening…' : 'Open document'}</button>
              </article>
            ))}</div> : <div className="portal-empty"><h2>No documents available</h2><p>Shared course and college documents will appear here.</p></div>}
          </section>
          <aside
            ref={viewerRef}
            className={`document-viewer${selected ? ' is-open' : ''}`}
            aria-live="polite"
            aria-labelledby={selected ? 'document-viewer-title' : 'document-viewer-empty-title'}
            tabIndex={selected ? -1 : undefined}
          >
            {selected ? <><header><div><p>{selected.category}</p><h2 id="document-viewer-title">{selected.title}</h2></div><button type="button" aria-label="Close document" onClick={() => setSelected(null)}>×</button></header><div className="document-viewer__content"><span>Document preview</span><p>{selected.content}</p><small>{selected.file_path}</small></div></> : <div className="document-viewer__empty"><span aria-hidden="true">CW</span><h2 id="document-viewer-empty-title">Select a document</h2><p>A text preview will open here.</p></div>}
          </aside>
        </div>
      )}
    </PortalLayout>
  );
}

export function PortalAssignments({ user }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setStatus({ state: 'uploading', message: '' });
    try {
      const result = await api.uploadAssignment(file.name, await file.text());
      const needsAttention = ['rejected', 'quarantined'].includes(result.status);
      setStatus({ state: needsAttention ? 'warning' : 'success', message: result.message || `${file.name} was submitted.` });
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <PortalLayout user={user} eyebrow="Coursework" title="Assignments" intro="Review upcoming work and submit files through the course dropbox.">
      <div className="assignment-layout">
        <section className="portal-panel assignment-list"><header><div><p className="eyebrow">Upcoming</p><h2>Open assignments</h2></div></header>{assignmentCatalog.map((assignment) => <article key={assignment.title}><span>{assignment.course}</span><div><h3>{assignment.title}</h3><p>Due {assignment.due}</p></div><small className={`portal-status portal-status--${assignment.status.toLowerCase()}`}>{assignment.status}</small></article>)}</section>
        <aside className="portal-panel upload-panel"><p className="eyebrow">Course dropbox</p><h2>Submit a document</h2><p>Choose a text-based assignment file. Your instructor will receive the final submitted version.</p><form onSubmit={submit}><label className="file-drop"><input type="file" accept=".txt,.md,.csv,.xml,.json" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span aria-hidden="true">↑</span><strong>{file ? file.name : 'Choose a file'}</strong><small>TXT, MD, CSV, XML, or JSON</small></label>{status.state === 'error' && <InlineStatus tone="error">{status.message}</InlineStatus>}{status.state === 'warning' && <InlineStatus tone="warning">{status.message}</InlineStatus>}{status.state === 'success' && <InlineStatus tone="success">{status.message}</InlineStatus>}<button className="button button--wide" type="submit" disabled={!file || status.state === 'uploading'}>{status.state === 'uploading' ? 'Submitting…' : 'Submit assignment'}</button></form></aside>
      </div>
    </PortalLayout>
  );
}

export function PortalFinancialAid({ user }) {
  const [aid, setAid] = useState({
    academic_year: '2026–27',
    crestwood_grant: 12000,
    federal_loan_eligibility: 5500,
    work_study: 1000,
    total_estimated_aid: 18500,
  });

  useEffect(() => {
    let active = true;
    api.financialAid().then((result) => { if (active) setAid(result); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const money = (value) => new Intl.NumberFormat(undefined, {
    style: 'currency', currency: aid.currency || 'USD', maximumFractionDigits: 0,
  }).format(value || 0);

  return (
    <PortalLayout user={user} eyebrow="Student finances" title="Financial aid" intro="Review your estimated aid, next steps, and helpful contacts for the 2026–27 academic year.">
      <section className="aid-hero"><div><p>Estimated financial aid</p><strong>{money(aid.total_estimated_aid)}</strong><span>{aid.academic_year} academic year</span></div><span className="aid-hero__status">Preliminary award</span></section>
      <div className="aid-layout">
        <section className="portal-panel"><header><div><p className="eyebrow">Award summary</p><h2>Estimated sources</h2></div></header><div className="award-list"><div><span>Crestwood Grant</span><strong>{money(aid.crestwood_grant)}</strong></div><div><span>Federal Direct Loan eligibility</span><strong>{money(aid.federal_loan_eligibility)}</strong></div><div><span>Campus employment estimate</span><strong>{money(aid.work_study)}</strong></div><div className="award-list__total"><span>Total estimated aid</span><strong>{money(aid.total_estimated_aid)}</strong></div></div><small>Final amounts depend on enrollment, FAFSA verification, and continuing eligibility.</small></section>
        <aside className="portal-panel aid-checklist"><header><div><p className="eyebrow">Next steps</p><h2>Complete your file</h2></div></header><label><input type="checkbox" checked readOnly /><span>FAFSA received</span></label><label><input type="checkbox" checked readOnly /><span>Student information confirmed</span></label><label><input type="checkbox" readOnly /><span>Review and accept final award</span></label><label><input type="checkbox" readOnly /><span>Complete loan counseling if needed</span></label></aside>
      </div>
      <div className="aid-contact"><div><h2>Questions about your offer?</h2><p>Student Financial Services can explain each part of your estimate and help with next steps.</p></div><a className="button button--outline" href="mailto:finaid@crestwood.edu">Contact your aid counselor</a></div>
    </PortalLayout>
  );
}
