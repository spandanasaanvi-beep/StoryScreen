import type { StoryDefinition } from '../domain/types';

export function StoryCard({ story, onStart, featured = false, action = 'Begin story' }: {
  story: StoryDefinition;
  onStart: (story: StoryDefinition) => void;
  featured?: boolean;
  action?: string;
}) {
  return (
    <button className={`story-card${featured ? ' story-card--featured' : ''}`} data-nav onClick={() => onStart(story)} style={{ '--story-accent': story.accent } as React.CSSProperties} aria-label={`${action}: ${story.title}`}>
      <div className="story-card__art">
        <img src={story.image} alt="" loading={featured ? 'eager' : 'lazy'} />
        <div className="story-card__shade" />
        <span className="story-card__genre">{story.genre}</span>
        <span className="story-card__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7V5Z" /></svg></span>
        <div className="story-card__copy">
          <h3>{story.title}</h3>
          <p>{story.subtitle}</p>
        </div>
      </div>
      <div className="story-card__meta"><span>{story.ageRange}</span><span className="meta-separator" /> <span>{story.duration}</span><span className="story-card__open">{action}<span aria-hidden="true"> ↗</span></span></div>
    </button>
  );
}
