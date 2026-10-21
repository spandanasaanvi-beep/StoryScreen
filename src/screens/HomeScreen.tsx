import { StoryCard } from '../components/StoryCard';
import { PortalMark } from '../components/Brand';
import type { StoryDefinition, StorySession } from '../domain/types';

export function HomeScreen({ stories, activeStory, activeSession, onStart, onContinue, onNavigate }: {
  stories: StoryDefinition[];
  activeStory?: StoryDefinition;
  activeSession?: StorySession;
  onStart: (story: StoryDefinition) => void;
  onContinue: () => void;
  onNavigate: (path: string) => void;
}) {
  const featured = activeStory ?? stories[0];
  if (!featured) return null;
  return (
    <div className="home-screen">
      <section className="hero-panel" style={{ '--hero-art': `url("${featured.image}")`, '--hero-accent': featured.accent } as React.CSSProperties}>
        <div className="hero-panel__image" />
        <div className="hero-panel__copy">
          <div className="eyebrow"><span className="eyebrow-line" /> STORIES THAT LISTEN <span className="eyebrow-star">✦</span></div>
          <p className="hero-kicker">A StoryScreen original · {featured.genre}</p>
          <h1>{activeSession ? 'Your story is waiting.' : 'Every choice\nchanges the story.'}</h1>
          <p className="hero-subtitle">{activeSession ? `Pick up where ${activeSession.protagonist} left off.` : 'A little wonder. A big adventure. A world that shifts with every choice.'}</p>
          <div className="hero-actions">
            <button className="button button--gold" data-nav onClick={activeSession ? onContinue : () => onStart(featured)}>
              <span className="button-icon" aria-hidden="true">{activeSession ? '▶' : '✦'}</span>{activeSession ? 'Continue the story' : 'Step into the story'}
            </button>
            <button className="button button--quiet" data-nav onClick={() => onNavigate('/library')}>Explore all stories <span aria-hidden="true">→</span></button>
          </div>
          <div className="hero-note"><span className="hero-note__mark"><PortalMark small /></span><span><strong>No two journeys are alike</strong><small>Your choices shape every chapter.</small></span></div>
        </div>
        <div className="hero-stamp" aria-hidden="true"><span>YOUR</span><PortalMark small /><span>NEXT<br/>CHAPTER</span></div>
        <div className="hero-index"><span>01</span><span className="hero-index__rule"/><span>{featured.genre.toUpperCase()}</span></div>
      </section>
      <section className="story-shelf" aria-labelledby="story-shelf-title">
        <div className="section-heading"><div><span className="eyebrow">CHOOSE YOUR WORLD</span><h2 id="story-shelf-title">An adventure is calling<span className="gold-dot">.</span></h2></div><button data-nav className="text-link" onClick={() => onNavigate('/library')}>View the library <span aria-hidden="true">→</span></button></div>
        <div className="story-rail">{stories.map((story) => <StoryCard key={story.id} story={story} onStart={onStart} />)}<button data-nav className="create-tile" onClick={() => onNavigate('/create')}><span className="create-tile__spark">✦</span><strong>Make it yours</strong><small>Create a new adventure</small><span className="create-tile__plus">+</span></button></div>
      </section>
      <section className="home-bottom"><span className="home-bottom__quote">“The best stories leave room for you.”</span><span className="home-bottom__hint">Use your arrows to explore <span>↑</span><span>↓</span><span>←</span><span>→</span></span></section>
    </div>
  );
}
