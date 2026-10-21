import type { StoryDefinition, StorySession } from '../domain/types';

export function HistoryScreen({ sessions, stories, onResume, onReplay, onBrowse }: {
  sessions: StorySession[];
  stories: StoryDefinition[];
  onResume: (session: StorySession) => void;
  onReplay: (story: StoryDefinition) => void;
  onBrowse: () => void;
}) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <section className="screen history-screen">
      <div className="screen-intro screen-intro--compact"><span className="eyebrow"><span className="eyebrow-line" /> THE STORY SO FAR</span><h1>Some paths end.<br/><em>Some call you back.</em></h1><p>Your saved chapters and journeys are kept here on this device.</p></div>
      {sorted.length === 0 ? <div className="empty-state"><div className="empty-state__mark">✦</div><h2>The page is still blank.</h2><p>Your adventures will appear here once you begin.</p><button className="button button--gold" data-nav onClick={onBrowse}>Find your first story <span aria-hidden="true">→</span></button></div> : <div className="history-list">{sorted.map((session) => {
        const story = stories.find((item) => item.id === session.storyId);
        const isComplete = Boolean(session.completedAt);
        return <article className="history-item" key={session.id}>
          <div className="history-item__art" style={{ backgroundImage: story ? `url("${story.image}")` : undefined }}><span>{isComplete ? 'FINISHED' : 'IN PROGRESS'}</span></div>
          <div className="history-item__copy"><span className="eyebrow">{session.genre} · {isComplete ? 'ENDING REACHED' : `${session.decisions.length} CHOICE${session.decisions.length === 1 ? '' : 'S'} MADE`}</span><h2>{session.title}</h2><p>{isComplete ? session.endingTitle : `A story with ${session.protagonist} still awaits its next chapter.`}</p><small>Last saved {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.updatedAt))}</small></div>
          <div className="history-item__actions">{!isComplete && <button data-nav className="button button--gold button--small" onClick={() => onResume(session)}>Resume</button>}{story && <button data-nav className="button button--quiet button--small" onClick={() => onReplay(story)}>{isComplete ? 'Replay differently' : 'Start again'}</button>}</div>
        </article>;
      })}</div>}
    </section>
  );
}
