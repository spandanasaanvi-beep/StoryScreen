import { useState, type FormEvent } from 'react';
import {
  ADVENTURE_GENRES,
  ADVENTURE_TONES,
  AGE_GROUPS,
  CHARACTER_TYPES,
  STORY_LENGTHS,
  type CustomAdventureInput,
  type StoryPreferences,
} from '../domain/types';

type RequiredField = 'genre' | 'protagonist' | 'characterType' | 'setting' | 'ageRange' | 'storyLength' | 'narration';
type FieldErrors = Partial<Record<RequiredField, string>>;

const styles: Array<{ id: StoryPreferences['protagonistStyle']; label: string; detail: string }> = [
  { id: 'scout', label: 'The scout', detail: 'Curious & bold' },
  { id: 'dreamer', label: 'The dreamer', detail: 'Thoughtful & kind' },
  { id: 'inventor', label: 'The inventor', detail: 'Clever & inventive' },
];

export function CreateScreen({ preferences, onPreferences, onCreate }: {
  preferences: StoryPreferences;
  onPreferences: (value: StoryPreferences) => void;
  onCreate: (input: CustomAdventureInput) => boolean | void;
}) {
  const [genre, setGenre] = useState('');
  const [title, setTitle] = useState('');
  const [setting, setSetting] = useState('');
  const [protagonist, setProtagonist] = useState('');
  const [characterType, setCharacterType] = useState('');
  const [tone, setTone] = useState<string>(ADVENTURE_TONES[0]);
  const [ageRange, setAgeRange] = useState('');
  const [storyLength, setStoryLength] = useState('');
  const [narration, setNarration] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [starting, setStarting] = useState(false);

  function clearFeedback() {
    setErrors({});
    setSubmitError('');
  }

  function fieldError(field: RequiredField) {
    const message = errors[field];
    return message ? <small className="form-error" id={`${field}-error`}>{message}</small> : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (starting) return;
    const nextErrors: FieldErrors = {};
    if (!genre) nextErrors.genre = 'Choose a genre.';
    if (!protagonist.trim()) nextErrors.protagonist = 'Enter your main character’s name.';
    if (!characterType) nextErrors.characterType = 'Choose a character type.';
    if (setting.trim().length < 4) nextErrors.setting = 'Describe the setting in at least four characters.';
    if (!ageRange) nextErrors.ageRange = 'Choose an age group.';
    if (!storyLength) nextErrors.storyLength = 'Choose a story length.';
    if (!narration) nextErrors.narration = 'Choose On or Off for narration.';
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setSubmitError('A few story details are still needed before you can begin.');
      return;
    }

    const input: CustomAdventureInput = {
      genre: genre as CustomAdventureInput['genre'],
      title: title.trim(),
      protagonist: protagonist.trim(),
      characterType: characterType as CustomAdventureInput['characterType'],
      setting: setting.trim(),
      ageRange: ageRange as CustomAdventureInput['ageRange'],
      storyLength: storyLength as CustomAdventureInput['storyLength'],
      narration: narration === 'On',
      tone,
    };
    setErrors({});
    setSubmitError('');
    setStarting(true);
    try {
      // Let the visible progress message render before building the local story graph.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
      const started = onCreate(input);
      if (started === false) {
        setSubmitError('We couldn’t start that adventure. Your progress is safe; please review the details and try again.');
        setStarting(false);
      }
    } catch {
      setSubmitError('We couldn’t start that adventure. Your progress is safe; please try again.');
      setStarting(false);
    }
  }

  const previewAccent = genre === 'Mystery' ? '#9fb6df' : ['Science Fiction', 'Adventure', 'Inspirational'].includes(genre) ? '#a7cf8d' : '#edbc68';
  const previewHeading = title.trim() || `${protagonist.trim() || 'Your hero'} explores`;
  const previewSubheading = setting.trim() || 'a place beyond the map';

  return (
    <section className="screen create-screen">
      <div className="create-heading"><span className="eyebrow"><span className="eyebrow-line" /> THE FIRST PAGE IS YOURS</span><h1>Make a little<br/><em>room for wonder.</em></h1><p>Choose the ingredients. The rest unfolds with every choice.</p></div>
      <div className="create-layout">
        <form className="adventure-form" noValidate onSubmit={submit}>
          {Object.keys(errors).length > 0 && <div className="form-errors" role="alert" aria-live="assertive"><strong>{submitError}</strong><ul>{Object.values(errors).map((message) => <li key={message}>{message}</li>)}</ul></div>}
          {submitError && Object.keys(errors).length === 0 && <p className="form-error form-error--summary" role="alert">{submitError}</p>}
          <div className="form-row">
            <label className="form-field"><span className="form-label">Genre</span><select id="genre" data-nav required value={genre} aria-invalid={Boolean(errors.genre)} aria-describedby={errors.genre ? 'genre-error' : undefined} onChange={(event) => { setGenre(event.target.value); clearFeedback(); }}><option value="" disabled>Select a genre</option>{ADVENTURE_GENRES.map((value) => <option key={value} value={value}>{value}</option>)}</select>{fieldError('genre')}</label>
            <label className="form-field"><span className="form-label">Story title <span className="optional-label">optional</span></span><input data-nav maxLength={80} value={title} onChange={(event) => { setTitle(event.target.value); clearFeedback(); }} placeholder="Leave blank to discover a title" /></label>
          </div>
          <div className="form-row">
            <label className="form-field"><span className="form-label">Main character name</span><input id="protagonist" data-nav maxLength={40} value={protagonist} aria-invalid={Boolean(errors.protagonist)} aria-describedby={errors.protagonist ? 'protagonist-error' : undefined} onChange={(event) => { setProtagonist(event.target.value); clearFeedback(); }} placeholder="Who leads this story?" />{fieldError('protagonist')}</label>
            <label className="form-field"><span className="form-label">Character type</span><select id="characterType" data-nav required value={characterType} aria-invalid={Boolean(errors.characterType)} aria-describedby={errors.characterType ? 'characterType-error' : undefined} onChange={(event) => { setCharacterType(event.target.value); clearFeedback(); }}><option value="" disabled>Choose a character type</option>{CHARACTER_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select>{fieldError('characterType')}</label>
          </div>
          <label className="form-field"><span className="form-label">Setting or world</span><input id="setting" data-nav minLength={4} maxLength={80} value={setting} aria-invalid={Boolean(errors.setting)} aria-describedby={errors.setting ? 'setting-error' : undefined} onChange={(event) => { setSetting(event.target.value); clearFeedback(); }} placeholder="A forest that glows after sunset" />{fieldError('setting')}</label>
          <div className="form-row">
            <label className="form-field"><span className="form-label">Age group</span><select id="ageRange" data-nav required value={ageRange} aria-invalid={Boolean(errors.ageRange)} aria-describedby={errors.ageRange ? 'ageRange-error' : undefined} onChange={(event) => { setAgeRange(event.target.value); clearFeedback(); }}><option value="" disabled>Choose an age group</option>{AGE_GROUPS.map((value) => <option key={value} value={value}>{value}</option>)}</select>{fieldError('ageRange')}</label>
            <label className="form-field"><span className="form-label">Story length</span><select id="storyLength" data-nav required value={storyLength} aria-invalid={Boolean(errors.storyLength)} aria-describedby={errors.storyLength ? 'storyLength-error' : undefined} onChange={(event) => { setStoryLength(event.target.value); clearFeedback(); }}><option value="" disabled>Choose a length</option>{STORY_LENGTHS.map((value) => <option key={value} value={value}>{value}</option>)}</select>{fieldError('storyLength')}</label>
          </div>
          <div className="form-row">
            <label className="form-field"><span className="form-label">Narration</span><select id="narration" data-nav required value={narration} aria-invalid={Boolean(errors.narration)} aria-describedby={errors.narration ? 'narration-error' : undefined} onChange={(event) => { setNarration(event.target.value); clearFeedback(); }}><option value="" disabled>Choose On or Off</option><option value="On">On</option><option value="Off">Off</option></select>{fieldError('narration')}</label>
            <label className="form-field"><span className="form-label">The feeling</span><select data-nav value={tone} onChange={(event) => { setTone(event.target.value); clearFeedback(); }}>{ADVENTURE_TONES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          <fieldset className="style-fieldset"><legend className="form-label">A little character detail <span className="optional-label">optional</span></legend><div className="style-options">{styles.map((style) => <button type="button" data-nav key={style.id} className={`style-option${preferences.protagonistStyle === style.id ? ' is-selected' : ''}`} onClick={() => onPreferences({ ...preferences, protagonistStyle: style.id })}><span className={`style-option__shape style-option__shape--${style.id}`} /><span><strong>{style.label}</strong><small>{style.detail}</small></span></button>)}</div></fieldset>
          <button className="button button--gold create-submit" data-nav type="submit" disabled={starting} aria-busy={starting}>{starting ? <><span className="start-spinner" aria-hidden="true" /> Opening your first scene…</> : <>Start Adventure <span aria-hidden="true">→</span></>}</button>
          {starting && <p className="form-status" role="status">Building your story from these choices…</p>}
          <p className="form-footnote">Created right here, ready to play offline. No account needed.</p>
        </form>
        <aside className="create-preview" style={{ '--preview-accent': previewAccent } as React.CSSProperties}>
          <div className="create-preview__glow" />
          <span className="eyebrow">YOUR STORY SEED</span>
          <div className="preview-sigil">✦</div>
          <span className="preview-genre">{genre || 'Choose a genre'}{ageRange ? ` · ${ageRange}` : ''}</span>
          <h2>{previewHeading}<br/><em>{previewSubheading}</em></h2>
          <p>{characterType || 'Choose a character type'} · {tone}. Your choices will shape a {storyLength.toLowerCase() || 'new'} story.</p>
          <div className="preview-rule" />
          <div className="preview-meta"><span>{storyLength || 'Story length'} · 3 possible endings</span><span>·</span><span>{narration || 'Narration'} · Offline ready</span></div>
        </aside>
      </div>
    </section>
  );
}
