import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  campusEvents,
  developerResources,
  facultyDirectory,
  programCatalog,
} from '../content';
import { InlineStatus, LoadingPanel, PageHero, SectionHeading } from '../components/SiteChrome';

export function AboutPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="About Crestwood"
        title="Rooted in place. Ready for what is next."
        intro="For more than a century, Crestwood has brought serious study and public purpose together in a community small enough to know each person well."
        tone="forest"
      >
        <blockquote>“Education is not preparation for a useful life. It is the practice of one.”</blockquote>
      </PageHero>

      <section className="section">
        <div className="site-container story-grid">
          <div>
            <p className="eyebrow">Our mission</p>
            <h2>Learn carefully. Listen generously. Leave things stronger.</h2>
          </div>
          <div className="prose-column">
            <p className="lead">
              Crestwood College educates thoughtful people who connect knowledge with action and ambition
              with care.
            </p>
            <p>
              Our students learn across disciplines, work closely with faculty, and practice their ideas in
              Northbridge and beyond. We believe a broad education is most powerful when it helps people ask
              better questions, make sound judgments, and contribute with humility.
            </p>
            <p>
              The result is an education grounded in enduring habits—curiosity, clarity, collaboration, and
              responsibility—and flexible enough for lives and careers that will continue to change.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--sage">
        <div className="site-container">
          <SectionHeading eyebrow="What guides us" title="A community built around shared values" />
          <div className="value-grid">
            <article><span>01</span><h3>Intellectual courage</h3><p>Follow evidence, revise your thinking, and pursue difficult questions with patience.</p></article>
            <article><span>02</span><h3>Generous attention</h3><p>Listen closely enough to understand people, places, and ideas on their own terms.</p></article>
            <article><span>03</span><h3>Useful knowledge</h3><p>Put learning to work in ways that strengthen communities and expand opportunity.</p></article>
            <article><span>04</span><h3>Belonging by design</h3><p>Create a campus where different experiences are valued and every student can participate fully.</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="site-container history-layout">
          <div className="history-layout__intro">
            <p className="eyebrow">Our history</p>
            <h2>More than 130 years of learning in Northbridge</h2>
            <p>Crestwood has grown from a teacher-training institute into a nationally connected liberal arts college without losing its regional commitments.</p>
          </div>
          <ol className="timeline-list">
            <li><time>1894</time><div><h3>Crestwood opens its doors</h3><p>Forty-two students begin classes in what is now Founders Hall.</p></div></li>
            <li><time>1948</time><div><h3>A broader college</h3><p>Programs expand into the arts, sciences, business, and civic leadership.</p></div></li>
            <li><time>1997</time><div><h3>Alden Science Center</h3><p>A new collaborative science complex brings teaching and undergraduate research together.</p></div></li>
            <li><time>2026</time><div><h3>Learning for a changing world</h3><p>Crestwood advances access, sustainability, and community-engaged education.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="fact-band">
        <div className="site-container fact-band__grid">
          <div><strong>140</strong><span>wooded acres</span></div>
          <div><strong>38</strong><span>areas of study</span></div>
          <div><strong>42</strong><span>states represented</span></div>
          <div><strong>27</strong><span>countries represented</span></div>
        </div>
      </section>

      <section className="section">
        <div className="site-container accreditation-card">
          <div><p className="eyebrow">Institutional information</p><h2>Accreditation & governance</h2></div>
          <p>
            Crestwood College is accredited by the New England Commission of Higher Education. The college
            is governed by an independent board of trustees and publishes annual information about outcomes,
            affordability, and institutional priorities.
          </p>
        </div>
      </section>
    </main>
  );
}

export function AcademicsPage() {
  const [programs, setPrograms] = useState(programCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All programs');
  const [query, setQuery] = useState('');

  async function loadPrograms() {
    setLoading(true);
    setError('');
    try {
      const apiPrograms = await api.programs();
      const merged = programCatalog.map((local) => ({
        ...local,
        ...(apiPrograms.find((remote) => remote.name === local.name) || {}),
      }));
      setPrograms(merged);
    } catch (requestError) {
      setPrograms(programCatalog);
      setError(`${requestError.message} Showing the current catalog copy instead.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPrograms(); }, []);

  const categories = ['All programs', ...new Set(programs.map((program) => program.category))];
  const filtered = useMemo(() => programs.filter((program) => {
    const categoryMatch = category === 'All programs' || program.category === category;
    const queryMatch = `${program.name} ${program.description}`.toLowerCase().includes(query.toLowerCase());
    return categoryMatch && queryMatch;
  }), [category, programs, query]);

  return (
    <main id="main-content">
      <PageHero
        eyebrow="Academics"
        title="Study what matters. Connect what you learn."
        intro="Crestwood programs pair disciplinary depth with the flexibility to follow ideas across fields—and the expectation that you will put them into practice."
      >
        <div className="page-hero__stat"><strong>38</strong><span>majors, minors, and pathways</span></div>
      </PageHero>

      <section className="section">
        <div className="site-container">
          <SectionHeading
            eyebrow="Undergraduate programs"
            title="Find a path that fits your questions"
            intro="Search the catalog or explore by area of interest. Every program includes advising, experiential learning, and a culminating project."
          />

          {error && <InlineStatus tone="warning" onRetry={loadPrograms}>{error}</InlineStatus>}

          <div className="catalog-controls">
            <label className="search-field">
              <span className="sr-only">Search programs</span>
              <input
                type="search"
                placeholder="Search programs"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="filter-chips" aria-label="Filter by area">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={category === item ? 'is-active' : ''}
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? <LoadingPanel message="Loading the academic catalog…" /> : (
            filtered.length ? (
              <div className="catalog-grid">
                {filtered.map((program) => (
                  <article className="catalog-card" key={program.name}>
                    <div className="catalog-card__meta"><span>{program.category}</span><strong>{program.degree}</strong></div>
                    <h2>{program.name}</h2>
                    <p>{program.description}</p>
                    <div className="catalog-card__detail"><p>{program.detail}</p><span>{program.duration}</span></div>
                    <Link to="/admissions">Ask about this program <span aria-hidden="true">→</span></Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-panel"><h2>No programs match that search</h2><p>Try a different term or choose “All programs.”</p></div>
            )
          )}
        </div>
      </section>

      <section className="section section--forest">
        <div className="site-container learning-grid">
          <div><p className="eyebrow eyebrow--light">How learning works here</p><h2>Depth, range, and a reason to use both.</h2></div>
          <div className="learning-principles">
            <article><strong>01</strong><div><h3>Begin broadly</h3><p>Seminars and shared inquiry courses give every student a strong base in writing, evidence, and collaboration.</p></div></article>
            <article><strong>02</strong><div><h3>Practice early</h3><p>Labs, studios, fieldwork, and community projects begin well before senior year.</p></div></article>
            <article><strong>03</strong><div><h3>Finish with purpose</h3><p>A capstone asks you to bring your learning together around a meaningful problem.</p></div></article>
          </div>
        </div>
      </section>
    </main>
  );
}

export function AdmissionsPage() {
  const initialForm = { name: '', email: '', program: programCatalog[0].name, message: '' };
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus({ state: 'submitting', message: '' });
    try {
      const result = await api.admissions(form);
      setStatus({ state: 'success', message: result.message || 'Your request has been received.' });
      setForm(initialForm);
    } catch (error) {
      setStatus({ state: 'error', message: error.message });
    }
  }

  return (
    <main id="main-content">
      <PageHero
        eyebrow="Admissions & aid"
        title="A Crestwood education begins with a conversation."
        intro="Tell us what you are curious about, visit campus, and get straightforward guidance on applying and paying for college."
        tone="gold"
      >
        <div className="deadline-card"><span>Fall 2026 priority date</span><strong>March 15</strong><p>Applications remain open on a space-available basis.</p></div>
      </PageHero>

      <nav className="anchor-navigation" aria-label="Admissions page sections">
        <div className="site-container"><a href="#apply">How to apply</a><a href="#costs">Costs & aid</a><a href="#visit">Visit</a><a href="#request-info">Request information</a></div>
      </nav>

      <section className="section" id="apply">
        <div className="site-container admissions-steps">
          <div><p className="eyebrow">How to apply</p><h2>We look for the whole person, not a perfect application.</h2><p>There is no application fee, and standardized test scores are optional. Your work, interests, and perspective matter most.</p></div>
          <ol>
            <li><span>01</span><div><h3>Complete your application</h3><p>Use the Crestwood application or Common Application and tell us what you hope to explore.</p></div></li>
            <li><span>02</span><div><h3>Send your transcript</h3><p>Ask your school to share an official secondary-school transcript.</p></div></li>
            <li><span>03</span><div><h3>Invite one recommendation</h3><p>A teacher or counselor can help us understand how you learn and contribute.</p></div></li>
            <li><span>04</span><div><h3>Apply for aid</h3><p>Submit the FAFSA so our aid team can build your personalized offer.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section section--sage" id="costs">
        <div className="site-container cost-layout">
          <div><p className="eyebrow">Costs & financial aid</p><h2>We work to make Crestwood possible.</h2><p>Most students pay less than the published price. Grants and scholarships are based on need, achievement, and community contribution.</p><Link className="text-link" to="/portal/financial-aid">Learn about financial aid <span aria-hidden="true">→</span></Link></div>
          <div className="cost-card">
            <div><span>Students receiving aid</span><strong>88%</strong></div>
            <div><span>Average institutional award</span><strong>$24,700</strong></div>
            <div><span>Average aid notification</span><strong>2 weeks</strong></div>
            <small>Illustrative 2026–27 figures for planning purposes.</small>
          </div>
        </div>
      </section>

      <section className="section" id="visit">
        <div className="site-container visit-card">
          <div className="visit-card__art" aria-hidden="true"><span>C</span></div>
          <div><p className="eyebrow eyebrow--light">Visit Crestwood</p><h2>Walk the paths. Meet the people.</h2><p>Campus visits include a student-led tour, an admissions conversation, and time to explore Northbridge.</p><a className="button button--gold" href="mailto:visit@crestwood.edu">Schedule a visit</a></div>
        </div>
      </section>

      <section className="section section--cream" id="request-info">
        <div className="site-container inquiry-layout">
          <div><p className="eyebrow">Request information</p><h2>What would you like to know?</h2><p>Share your interests and an admissions counselor will follow up within five business days.</p><div className="contact-note"><strong>Admissions Office</strong><span>admissions@crestwood.edu</span><span>(802) 555-0118</span></div></div>
          <form className="editorial-form" onSubmit={submit}>
            <div className="form-grid">
              <label>Full name<input required autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
              <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
            </div>
            <label>Program of interest<select value={form.program} onChange={(event) => update('program', event.target.value)}>{programCatalog.map((program) => <option key={program.name}>{program.name}</option>)}</select></label>
            <label>What would you like us to know?<textarea value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Questions, interests, or visit plans" /></label>
            {status.state === 'error' && <InlineStatus tone="error">{status.message}</InlineStatus>}
            {status.state === 'success' && <InlineStatus tone="success">{status.message}</InlineStatus>}
            <button className="button" type="submit" disabled={status.state === 'submitting'}>{status.state === 'submitting' ? 'Sending…' : 'Send my request'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export function CampusLifePage() {
  return (
    <main id="main-content">
      <PageHero eyebrow="Campus life" title="A place to belong—and room to become." intro="Life at Crestwood moves between residence halls, rehearsal rooms, wooded trails, late-night study tables, and a downtown that feels like an extension of campus." tone="forest">
        <div className="page-hero__stat"><strong>100%</strong><span>of first-year students live on campus</span></div>
      </PageHero>

      <section className="section">
        <div className="site-container campus-story-grid">
          <div className="campus-story-grid__art"><span>Northbridge<br />from campus</span></div>
          <div><p className="eyebrow">Life in Northbridge</p><h2>Nature at the doorstep. A lively town down the hill.</h2><p className="lead">Crestwood feels peaceful without feeling removed.</p><p>Students move easily between campus traditions, cafés and galleries downtown, internships with regional organizations, and four seasons of outdoor life around Lake Alden.</p><Link className="text-link" to="/admissions#visit">Plan a campus visit <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>

      <section className="section section--sage">
        <div className="site-container">
          <SectionHeading eyebrow="Make it yours" title="More than a place to study" />
          <div className="campus-life-grid">
            <article><span className="line-icon" aria-hidden="true">01</span><h3>Living on campus</h3><p>Welcoming residence communities, trained peer leaders, and shared spaces designed for connection.</p><a href="mailto:housing@crestwood.edu">Housing information →</a></article>
            <article><span className="line-icon" aria-hidden="true">02</span><h3>Clubs & leadership</h3><p>More than 70 student-led groups, from robotics and radio to cultural organizations and outdoor leadership.</p><a href="#events">Explore student events →</a></article>
            <article><span className="line-icon" aria-hidden="true">03</span><h3>Athletics & recreation</h3><p>Eighteen Division III teams, club sports, intramurals, fitness classes, and miles of campus trails.</p><a href="mailto:athletics@crestwood.edu">Visit athletics →</a></article>
            <article><span className="line-icon" aria-hidden="true">04</span><h3>Well-being</h3><p>Integrated health, counseling, accessibility, and spiritual-life resources centered on the whole student.</p><a href="mailto:wellbeing@crestwood.edu">Student support →</a></article>
          </div>
        </div>
      </section>

      <section className="section" id="events">
        <div className="site-container events-layout">
          <div><p className="eyebrow">Campus calendar</p><h2>There is always something worth showing up for.</h2><p>Lectures, performances, traditions, games, and gatherings are open to the Crestwood community unless noted.</p></div>
          <div className="event-list event-list--large">
            {campusEvents.map((event) => (
              <article key={event.title}><time><span>{event.month}</span><strong>{event.day}</strong></time><div><h3>{event.title}</h3><p>{event.meta}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className="quote-feature"><div className="site-container"><blockquote>“I came for a program. I stayed because this became the kind of community where I could try things before I knew I was good at them.”</blockquote><p>— Jordan Kim ’27, Business Administration</p></div></section>
    </main>
  );
}

export function FacultyPage() {
  const [directory, setDirectory] = useState(facultyDirectory);
  const [department, setDepartment] = useState('All departments');
  useEffect(() => {
    let active = true;
    api.faculty().then((items) => {
      if (!active || !items.length) return;
      setDirectory(items.map((item) => {
        const local = facultyDirectory.find((faculty) => faculty.name === item.name) || {};
        return {
          ...local,
          ...item,
          initials: item.name.split(' ').filter((part) => !part.endsWith('.')).map((part) => part[0]).slice(0, 2).join(''),
          interests: item.focus || local.interests,
          office: local.office || 'See department directory',
        };
      }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const departments = ['All departments', ...new Set(directory.map((faculty) => faculty.department))];
  const visibleFaculty = department === 'All departments'
    ? directory
    : directory.filter((faculty) => faculty.department === department);

  return (
    <main id="main-content">
      <PageHero eyebrow="Faculty" title="Teachers first. Scholars always. Mentors by choice." intro="Crestwood faculty bring active research and professional practice into small classes—and make time to know the people in them." />
      <section className="section">
        <div className="site-container">
          <div className="directory-toolbar">
            <div><p className="eyebrow">Faculty directory</p><h2>Meet the people behind the programs</h2></div>
            <label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="faculty-grid">
            {visibleFaculty.map((faculty) => (
              <article className="faculty-card" key={faculty.name}>
                <div className="faculty-card__portrait" aria-hidden="true"><span>{faculty.initials}</span></div>
                <div className="faculty-card__copy">
                  <p>{faculty.department}</p><h2>{faculty.name}</h2><strong>{faculty.title}</strong>
                  <dl><div><dt>Teaching & research</dt><dd>{faculty.interests}</dd></div><div><dt>Office</dt><dd>{faculty.office}</dd></div></dl>
                  <a href={`mailto:${faculty.name.toLowerCase().replace(/dr\.|prof\.|\s/g, '')}@crestwood.edu`}>Email {faculty.name.split(' ').at(-1)} <span aria-hidden="true">→</span></a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="faculty-cta"><div className="site-container"><div><p className="eyebrow eyebrow--light">Work with us</p><h2>Join a college built around excellent teaching.</h2></div><a className="button button--gold" href="mailto:hr@crestwood.edu">View faculty opportunities</a></div></section>
    </main>
  );
}

export function DeveloperResourcesPage() {
  const [platform, setPlatform] = useState({ status: 'available', documentation: [] });
  useEffect(() => {
    let active = true;
    api.developerResources().then((result) => { if (active) setPlatform(result); }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <main id="main-content">
      <PageHero eyebrow="Information technology" title="Tools and guidance for the Crestwood community." intro="Find account support, service information, and technical resources for approved campus projects." tone="forest">
        <div className="service-status"><span aria-hidden="true" /><div><strong>{platform.status === 'available' ? 'All core services operational' : 'Service status available from IT'}</strong><p>{platform.environment || 'Crestwood digital services'}</p></div></div>
      </PageHero>

      <section className="section">
        <div className="site-container support-grid">
          <article><p className="eyebrow">Get help</p><h2>IT Service Desk</h2><p>Account access, devices, classroom technology, wireless networking, and software support.</p><a className="button" href="mailto:help@crestwood.edu">Open a support request</a><dl><div><dt>Phone</dt><dd>(802) 555-0140</dd></div><div><dt>Hours</dt><dd>Mon–Fri, 8 a.m.–8 p.m.</dd></div><div><dt>Location</dt><dd>Alden Library, level 1</dd></div></dl></article>
          <div className="support-links"><a href="mailto:help@crestwood.edu?subject=Password%20help"><strong>Password & account access</strong><span>Reset credentials or unlock an account →</span></a><a href="mailto:help@crestwood.edu?subject=Wireless%20help"><strong>Wireless & network</strong><span>Connect to Crestwood Secure →</span></a><a href="mailto:help@crestwood.edu?subject=Software%20request"><strong>Software catalog</strong><span>Request approved academic software →</span></a><a href="mailto:help@crestwood.edu?subject=Accessibility%20technology"><strong>Accessibility technology</strong><span>Get adaptive technology support →</span></a></div>
        </div>
      </section>

      <section className="section section--cream" id="developers">
        <div className="site-container">
          <SectionHeading eyebrow="Developer resources" title="Build responsibly for Crestwood" intro="Documentation and shared services for staff, student employees, and approved technology partners." />
          <div className="developer-grid">
            {developerResources.map((resource) => <article key={resource.title}><p>{resource.eyebrow}</p><h3>{resource.title}</h3><span>{resource.description}</span><small>{resource.meta}</small><a href="mailto:digital@crestwood.edu">Request access <span aria-hidden="true">→</span></a></article>)}
          </div>
          {platform.documentation?.length > 0 && <div className="documentation-strip"><strong>Available documentation</strong><ul>{platform.documentation.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <div className="registry-card">
            <div><p className="eyebrow">Internal package registry</p><h2>crestwood-internal-utils</h2><p>Shared helpers for sanctioned campus integrations. Access is limited to managed devices and approved service accounts.</p></div>
            <div className="code-sample"><span>Registry endpoint</span><code>{platform.packages?.[0]?.registry || '/api/v1/target/fake-registry/crestwood-internal-utils'}</code><span>Current stable release</span><code>{platform.packages?.[0]?.version || '3.4.2'}</code></div>
          </div>
        </div>
      </section>

      <section className="section"><div className="site-container policy-row"><div><p className="eyebrow">Before you build</p><h2>Technology review</h2></div><p>Projects that use college identity, student records, payments, or externally hosted services require architecture and privacy review before launch.</p><a className="text-link" href="mailto:digital@crestwood.edu">Start a review <span aria-hidden="true">→</span></a></div></section>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="not-found" id="main-content">
      <div><p className="eyebrow">404 · Page not found</p><h1>This path does not lead across campus.</h1><p>The page may have moved, or the address may be incomplete.</p><Link className="button" to="/">Return to the Crestwood home page</Link></div>
    </main>
  );
}
