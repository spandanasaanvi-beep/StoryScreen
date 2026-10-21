import type { ReactNode } from 'react';

export function PortalMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`portal-mark${small ? ' portal-mark--small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="presentation">
        <path d="M24 4C12.7 4 5.5 12.8 5.5 23.7c0 8.7 5.9 15.8 18.5 20.3 12.6-4.5 18.5-11.6 18.5-20.3C42.5 12.8 35.3 4 24 4Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M24 12.4c-6.4 0-10.2 5-10.2 11.1 0 5 3.4 9.7 10.2 13.7 6.8-4 10.2-8.7 10.2-13.7 0-6.1-3.8-11.1-10.2-11.1Z" fill="currentColor" opacity=".9" />
        <path d="m24 19 2 4.2 4.6.7-3.3 3.2.8 4.6-4.1-2.2-4.1 2.2.8-4.6-3.3-3.2 4.6-.7 2-4.2Z" fill="#fff8e6" />
      </svg>
    </span>
  );
}

export function Brand({ children }: { children?: ReactNode }) {
  return <span className="brand-lockup"><PortalMark /><span className="brand-wordmark">Story<span>Screen</span></span>{children}</span>;
}

const links = [
  { label: 'Explore', path: '/library' },
  { label: 'Create', path: '/create' },
  { label: 'History', path: '/history' },
];

export function SiteHeader({ pathname, navigate }: { pathname: string; navigate: (path: string) => void }) {
  return (
    <header className="site-header">
      <button className="brand-button" data-nav onClick={() => navigate('/')} aria-label="StoryScreen home"><Brand /></button>
      <nav className="primary-nav" aria-label="Main navigation">
        {links.map((link) => (
          <button key={link.path} data-nav className={`nav-link${pathname.startsWith(link.path) ? ' is-active' : ''}`} onClick={() => navigate(link.path)}>
            {link.label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <span className="guest-pill"><span className="status-dot" />Guest mode</span>
        <button data-nav className={`icon-button${pathname === '/settings' ? ' is-active' : ''}`} onClick={() => navigate('/settings')} aria-label="Open settings" title="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z"/><path d="m19.4 13.4 1.1.8-1.1 1.9-1.3-.5a7.8 7.8 0 0 1-1.3.8l-.2 1.4h-2.2l-.3-1.4a7.8 7.8 0 0 1-1.5 0l-.7 1.2-1.9-1.1.5-1.3a7.8 7.8 0 0 1-.8-1.3l-1.4-.2v-2.2l1.4-.3a7.8 7.8 0 0 1 0-1.5L6.5 9l1.1-1.9 1.3.5a7.8 7.8 0 0 1 1.3-.8l.2-1.4h2.2l.3 1.4a7.8 7.8 0 0 1 1.5 0l.7-1.2 1.9 1.1-.5 1.3a7.8 7.8 0 0 1 .8 1.3l1.4.2v2.2l-1.4.3a7.8 7.8 0 0 1 0 1.5Z"/></svg>
        </button>
      </div>
    </header>
  );
}
