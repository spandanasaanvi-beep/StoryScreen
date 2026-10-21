import { StoryCard } from '../components/StoryCard';
import type { StoryDefinition } from '../domain/types';

export function LibraryScreen({ stories, onStart, onCreate }: { stories: StoryDefinition[]; onStart: (story: StoryDefinition) => void; onCreate: () => void }) {
  return (
    <section className="screen library-screen">
      <div className="screen-intro"><span className="eyebrow"><span className="eyebrow-line" /> THE STORY LIBRARY</span><h1>Pick a world.<br/><em>Find your way.</em></h1><p>Every adventure has more than one ending. The story changes when you do.</p></div>
      <div className="library-feature-note"><span className="library-feature-note__star">✦</span><span><strong>Made for more than one sitting</strong><small>Save as you go. Come back when you’re ready.</small></span></div>
      <div className="library-grid">{stories.map((story) => <StoryCard key={story.id} story={story} onStart={onStart} action="Start this story" />)}<button className="create-card" data-nav onClick={onCreate}><span className="create-card__ring">✦</span><span className="eyebrow">YOUR IMAGINATION, FIRST</span><strong>A story no one<br/><em>has told yet.</em></strong><small>Choose a setting, name a hero, and decide what kind of adventure awaits.</small><span className="create-card__action">Create an adventure <span aria-hidden="true">→</span></span></button></div>
    </section>
  );
}
