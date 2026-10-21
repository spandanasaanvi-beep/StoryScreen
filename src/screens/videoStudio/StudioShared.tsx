import type { ReactNode } from 'react';

const STEPS = ['Choose a genre', 'Add details', 'Review script', 'Create video'];

export function StudioProgress({ active }: { active: number }) {
  return (
    <nav className="studio-progress" aria-label="Story video creation steps">
      {STEPS.map((label, index) => (
        <div className={`studio-progress__step${index + 1 === active ? ' is-current' : ''}${index + 1 < active ? ' is-complete' : ''}`} key={label} aria-current={index + 1 === active ? 'step' : undefined}>
          <span className="studio-progress__number">{index + 1 < active ? '✓' : `0${index + 1}`}</span>
          <span>{label}</span>
        </div>
      ))}
    </nav>
  );
}

export function StudioBackLink({ onClick, children = 'Back' }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" data-nav className="studio-back" onClick={onClick}><span aria-hidden="true">←</span>{children}</button>;
}

export function StudioAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' | 'success' }) {
  return <div className={`studio-alert studio-alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}
