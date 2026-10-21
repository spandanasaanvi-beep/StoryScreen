import { GENRES, type GenreDefinition } from '../../videoStudio/genres';
import type { GenreId } from '../../videoStudio/types';
import { StudioProgress } from './StudioShared';

export function GenreSelectScreen({ onSelect }: { onSelect: (genre: GenreId) => void }) {
  return (
    <section className="screen studio-screen genre-select-screen" aria-labelledby="genre-select-title">
      <StudioProgress active={1} />
      <header className="studio-heading">
        <span className="eyebrow"><span className="eyebrow-line" /> THE FIRST SCENE IS YOURS</span>
        <h1 id="genre-select-title">What kind of story<br /><em>shall we make?</em></h1>
        <p>Choose a world. We’ll shape your answers into a narrated, illustrated film.</p>
      </header>
      <div className="genre-grid" role="list" aria-label="Story genres">
        {GENRES.map((genre: GenreDefinition) => (
          <button
            className="genre-card"
            data-nav
            key={genre.id}
            onClick={() => onSelect(genre.id)}
            style={{ '--genre-accent': genre.accent } as React.CSSProperties}
            aria-label={`${genre.name}. ${genre.descriptor}`}
          >
            <img className="genre-card__art" src={genre.artUrl} alt="" aria-hidden="true" loading="lazy" />
            <span className="genre-card__shade" aria-hidden="true" />
            <span className="genre-card__number" aria-hidden="true">{String(GENRES.indexOf(genre) + 1).padStart(2, '0')}</span>
            <span className="genre-card__copy"><strong>{genre.name}</strong><small>{genre.descriptor}</small></span>
            <span className="genre-card__arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <p className="studio-footnote">No account needed. Your finished MP4 can be downloaded and saved anywhere.</p>
    </section>
  );
}
