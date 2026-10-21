import type { StoryDefinition, StorySession } from '../domain/types';
import { getCurrentScene } from '../engine/storyEngine';

export function EndingScreen({ story, session, onReplay, onTryAnotherPath, onHistory, onHome }: {
  story: StoryDefinition;
  session: StorySession;
  onReplay: () => void;
  onTryAnotherPath: () => void;
  onHistory: () => void;
  onHome: () => void;
}) {
  const scene = getCurrentScene(story, session);
  const ending = scene.ending;
  if (!ending) return null;
  return (
    <section className="ending-screen" style={{ '--ending-art': `url("${story.image}")`, '--ending-accent': story.accent } as React.CSSProperties}>
      <div className="ending-art" />
      <div className="ending-copy">
        <span className="eyebrow"><span className="eyebrow-line" /> THE ENDING YOU MADE</span>
        <div className="ending-badge">✦ <span>{ending.badge}</span></div>
        <h1>{ending.title}</h1>
        <p className="ending-scene-title">{scene.title}</p>
        <p className="ending-story-copy">{scene.body}</p>
        <p className="ending-epilogue">{ending.epilogue}</p>
        <div className="ending-credit">{session.protagonist}’s story · {session.decisions.length} choices made · {story.genre}</div>
        <div className="ending-trail"><span className="eyebrow">CHOICES THAT BROUGHT YOU HERE</span><ol>{session.decisions.map((decision, index) => <li key={`${decision.sceneId}-${decision.choiceId}-${index}`}><span>{decision.sceneTitle}</span><strong>{decision.choiceLabel}</strong></li>)}</ol></div>
        <div className="ending-actions">
          <button className="button button--gold" data-nav onClick={onReplay}>Play Again <span aria-hidden="true">↻</span></button>
          <button className="button button--quiet" data-nav onClick={onTryAnotherPath}>Try Another Path <span aria-hidden="true">→</span></button>
          <button className="button button--quiet" data-nav onClick={onHome}>Back to Home</button>
        </div>
      </div>
      <aside className="ending-record">
        <span className="eyebrow">A FEW THINGS YOU FOUND</span>
        <div className="ending-record__list"><strong>Clues</strong><span>{session.clues.length ? session.clues.join(' · ') : 'The path was your clue.'}</span><strong>Carried</strong><span>{session.inventory.length ? session.inventory.join(' · ') : 'You carried your curiosity.'}</span><strong>Bonds</strong><span>{Object.entries(session.relationships).map(([name, level]) => `${name} +${level}`).join(' · ') || 'New friends are waiting.'}</span></div>
        <button className="text-link" data-nav onClick={onHistory}>View Story History <span aria-hidden="true">→</span></button>
      </aside>
    </section>
  );
}
