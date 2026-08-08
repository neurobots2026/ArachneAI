import { NavLink } from 'react-router-dom';
import { CrestwoodMark } from './SiteChrome';

const portalLinks = [
  { to: '/portal/dashboard', label: 'Overview', short: 'OV' },
  { to: '/portal/courses', label: 'Courses', short: 'CR' },
  { to: '/portal/resources', label: 'Resources', short: 'RS' },
  { to: '/portal/assignments', label: 'Assignments', short: 'AS' },
  { to: '/portal/financial-aid', label: 'Financial aid', short: 'FA' },
  { to: '/portal/profile', label: 'Profile', short: 'PR' },
];

export default function PortalLayout({ user, eyebrow, title, intro, actions, children }) {
  return (
    <main className="portal-shell" id="main-content">
      <aside className="portal-sidebar">
        <div className="portal-sidebar__brand">
          <CrestwoodMark compact />
          <div><strong>My Crestwood</strong><span>Student portal</span></div>
        </div>
        <nav aria-label="Student portal navigation">
          {portalLinks.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <span aria-hidden="true">{item.short}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="portal-sidebar__user">
          <span className="user-avatar" aria-hidden="true">
            {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </span>
          <div><strong>{user.name}</strong><span>{user.student_id}</span></div>
        </div>
      </aside>
      <div className="portal-content">
        <header className="portal-page-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {intro && <p>{intro}</p>}
          </div>
          {actions && <div className="portal-page-header__actions">{actions}</div>}
        </header>
        {children}
      </div>
    </main>
  );
}
