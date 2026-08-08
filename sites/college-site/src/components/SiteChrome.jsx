import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const primaryNavigation = [
  { to: '/about', label: 'About' },
  { to: '/academics', label: 'Academics' },
  { to: '/admissions', label: 'Admissions' },
  { to: '/campus-life', label: 'Campus life' },
  { to: '/faculty', label: 'Faculty' },
];

export function CrestwoodMark({ compact = false }) {
  return (
    <span className={`crestwood-mark${compact ? ' crestwood-mark--compact' : ''}`} aria-hidden="true">
      <span className="crestwood-mark__tree">C</span>
    </span>
  );
}

export function SiteHeader({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="utility-bar">
        <div className="site-container utility-bar__inner">
          <span>Northbridge, Vermont · Founded 1894</span>
          <nav aria-label="Utility navigation">
            <Link to="/campus-life#events">Events</Link>
            <Link to="/developer-resources">IT helpdesk</Link>
            {user ? <Link to="/portal/dashboard">My Crestwood</Link> : <Link to="/login">Student login</Link>}
          </nav>
        </div>
      </div>
      <header className="site-header">
        <div className="site-container site-header__inner">
          <Link className="site-brand" to="/" aria-label="Crestwood College home">
            <CrestwoodMark />
            <span className="site-brand__text">
              <strong>Crestwood</strong>
              <span>College</span>
            </span>
          </Link>

          <button
            className="menu-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="menu-toggle__lines" aria-hidden="true"><i /><i /><i /></span>
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>

          <div className={`site-header__navigation${open ? ' is-open' : ''}`} id="primary-navigation">
            <nav className="primary-navigation" aria-label="Primary navigation">
              {primaryNavigation.map((item) => (
                <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
              ))}
            </nav>
            <div className="header-actions">
              {user ? (
                <>
                  {user.role === 'admin' && <NavLink className="header-link" to="/admin">Staff tools</NavLink>}
                  <NavLink className="button button--outline button--small" to="/portal/dashboard">
                    My Crestwood
                  </NavLink>
                  <button className="text-action" type="button" onClick={onLogout}>Sign out</button>
                </>
              ) : (
                <>
                  <NavLink className="header-link" to="/login">Log in</NavLink>
                  <NavLink className="button button--gold button--small" to="/admissions">Apply</NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__grid">
        <div className="site-footer__identity">
          <Link className="site-brand site-brand--footer" to="/">
            <CrestwoodMark />
            <span className="site-brand__text"><strong>Crestwood</strong><span>College</span></span>
          </Link>
          <p>44 College Way<br />Northbridge, VT 05471</p>
          <p><a href="tel:+18025550194">(802) 555-0194</a> · <a href="mailto:info@crestwood.edu">info@crestwood.edu</a></p>
        </div>
        <div>
          <h2>Discover</h2>
          <Link to="/about">About Crestwood</Link>
          <Link to="/academics">Programs of study</Link>
          <Link to="/faculty">Faculty directory</Link>
          <Link to="/campus-life">Campus life</Link>
        </div>
        <div>
          <h2>Get started</h2>
          <Link to="/admissions">Apply to Crestwood</Link>
          <Link to="/admissions#visit">Plan a visit</Link>
          <Link to="/admissions#costs">Tuition and aid</Link>
          <Link to="/login">Student portal</Link>
        </div>
        <div>
          <h2>Resources</h2>
          <Link to="/developer-resources">IT helpdesk</Link>
          <Link to="/developer-resources#developers">Developer resources</Link>
          <Link to="/portal/resources">Library resources</Link>
          <a href="mailto:accessibility@crestwood.edu">Accessibility</a>
        </div>
      </div>
      <div className="site-container site-footer__bottom">
        <span>© 2026 Crestwood College</span>
        <span>Learn with purpose. Lead with care.</span>
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro, children, tone = 'light' }) {
  return (
    <section className={`page-hero page-hero--${tone}`}>
      <div className="site-container page-hero__inner">
        <div className="page-hero__copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {intro && <p className="page-hero__intro">{intro}</p>}
        </div>
        {children && <div className="page-hero__aside">{children}</div>}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, intro, link }) {
  return (
    <header className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      {link}
    </header>
  );
}

export function LoadingPanel({ message = 'Loading Crestwood services…' }) {
  return (
    <div className="state-panel state-panel--loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

export function InlineStatus({ tone = 'info', children, onRetry }) {
  return (
    <div className={`inline-status inline-status--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onRetry && <button type="button" className="text-action" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);
  return null;
}
