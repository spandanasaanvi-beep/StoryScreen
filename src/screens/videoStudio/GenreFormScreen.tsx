import { useState, type FormEvent } from 'react';
import { findGenre } from '../../videoStudio/genres';
import {
  ASPECT_RATIOS,
  NARRATOR_VOICES,
  STORY_AUDIENCES,
  STORY_LANGUAGES,
  VIDEO_DURATIONS,
  VISUAL_STYLES,
  type AspectRatio,
  type GenreId,
  type NarratorVoice,
  type StoryAudience,
  type StoryGenerationRequest,
  type StoryLanguage,
  type VideoDuration,
  type VisualStyle,
} from '../../videoStudio/types';
import { StudioAlert, StudioBackLink, StudioProgress } from './StudioShared';

export function GenreFormScreen({ genreId, onBack, onGenerate }: {
  genreId: GenreId;
  onBack: () => void;
  onGenerate: (request: StoryGenerationRequest) => Promise<void>;
}) {
  const genre = findGenre(genreId);
  const [title, setTitle] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<StoryLanguage>('English');
  const [targetAudience, setTargetAudience] = useState<StoryAudience>('Family');
  const [durationSeconds, setDurationSeconds] = useState<VideoDuration>(30);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Painterly Storybook');
  const [narratorVoice, setNarratorVoice] = useState<NarratorVoice>('Warm Narrator');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [useAI, setUseAI] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!genre) return <section className="screen"><StudioAlert>That genre is not available. Choose from the story library again.</StudioAlert><StudioBackLink onClick={onBack}>Choose a genre</StudioBackLink></section>;

  function updateAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({ ...current, [id]: '' }));
    setSubmitError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextErrors: Record<string, string> = {};
    for (const question of genre.questions) {
      const answer = (answers[question.id] ?? '').trim();
      if (!answer) nextErrors[question.id] = `Add an answer for “${question.label}”.`;
      else if (answer.length < 2) nextErrors[question.id] = `Add a little more detail for “${question.label}”.`;
      else if (answer.length > question.maxLength) nextErrors[question.id] = `Keep “${question.label}” under ${question.maxLength} characters.`;
    }
    if (title.trim().length > 90) nextErrors.title = 'Keep the title under 90 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmitError('A few story details need your attention before we can draft the script.');
      return;
    }
    const request: StoryGenerationRequest = {
      genre: genre.id,
      title: title.trim() || undefined,
      language,
      targetAudience,
      durationSeconds,
      visualStyle,
      narratorVoice,
      aspectRatio,
      answers: Object.fromEntries(genre.questions.map((question) => [question.id, (answers[question.id] ?? '').trim()])),
      useAI,
    };
    setSubmitError('');
    setBusy(true);
    try {
      await onGenerate(request);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The story draft could not be created. Please check your connection and try again.');
      setBusy(false);
    }
  }

  const field = (question: (typeof genre.questions)[number]) => {
    const errorId = `${question.id}-error`;
    const value = answers[question.id] ?? '';
    return (
      <div className="studio-field" key={question.id}>
        <label htmlFor={`answer-${question.id}`}>{question.label}<span className="studio-required">Required</span></label>
        <input
          id={`answer-${question.id}`}
          data-nav
          required
          maxLength={question.maxLength}
          value={value}
          placeholder={question.placeholder}
          aria-invalid={Boolean(errors[question.id])}
          aria-describedby={errors[question.id] ? errorId : `${question.id}-hint`}
          onChange={(event) => updateAnswer(question.id, event.target.value)}
        />
        <div className="studio-field__meta"><span id={`${question.id}-hint`}>{question.hint ?? 'A few vivid details help the story feel like yours.'}</span><span>{value.length}/{question.maxLength}</span></div>
        {errors[question.id] && <small className="form-error" id={errorId}>{errors[question.id]}</small>}
      </div>
    );
  };

  return (
    <section className="screen studio-screen studio-form-screen" aria-labelledby="studio-form-title">
      <StudioProgress active={2} />
      <StudioBackLink onClick={onBack}>All genres</StudioBackLink>
      <header className="studio-heading studio-heading--compact" style={{ '--genre-accent': genre.accent } as React.CSSProperties}>
        <span className="eyebrow"><span className="eyebrow-line" /> {genre.shortLabel} · STORY DETAILS</span>
        <h1 id="studio-form-title">Give it a few<br /><em>beautiful details.</em></h1>
        <p>{genre.descriptor} Only the questions for {genre.name.toLowerCase()} are shown here.</p>
      </header>
      <div className="studio-form-layout">
        <form className="studio-form" onSubmit={submit} noValidate>
          {submitError && <StudioAlert>{submitError}</StudioAlert>}
          <div className="studio-field">
            <label htmlFor="story-title">Story title <span className="studio-optional">Optional</span></label>
            <input id="story-title" data-nav maxLength={90} value={title} placeholder="Leave blank to discover a title" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: '' })); setSubmitError(''); }} />
            {errors.title && <small className="form-error" id="title-error">{errors.title}</small>}
          </div>
          <div className="studio-question-list">{genre.questions.map(field)}</div>
          <fieldset className="studio-fieldset">
            <legend>Make it yours</legend>
            <div className="studio-options-grid">
              <label className="studio-field"><span>Language</span><select data-nav value={language} onChange={(event) => setLanguage(event.target.value as StoryLanguage)}>{STORY_LANGUAGES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="studio-field"><span>Made for</span><select data-nav value={targetAudience} onChange={(event) => setTargetAudience(event.target.value as StoryAudience)}>{STORY_AUDIENCES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="studio-field"><span>Video length</span><select data-nav value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) as VideoDuration)}>{VIDEO_DURATIONS.map((value) => <option key={value} value={value}>{value} seconds</option>)}</select></label>
              <label className="studio-field"><span>Illustration style</span><select data-nav value={visualStyle} onChange={(event) => setVisualStyle(event.target.value as VisualStyle)}>{VISUAL_STYLES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="studio-field"><span>Narrator</span><select data-nav value={narratorVoice} onChange={(event) => setNarratorVoice(event.target.value as NarratorVoice)}>{NARRATOR_VOICES.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="studio-field"><span>Frame</span><select data-nav value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value as AspectRatio)}>{ASPECT_RATIOS.map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
          </fieldset>
          <label className="studio-ai-choice">
            <input type="checkbox" data-nav checked={useAI} onChange={(event) => setUseAI(event.target.checked)} />
            <span className="studio-ai-choice__icon" aria-hidden="true">✦</span>
            <span><strong>Try Manus AI for the first draft</strong><small>If it is unavailable, StoryScreen will use its built-in story writer instead.</small></span>
          </label>
          <button className="button button--gold studio-submit" data-nav type="submit" disabled={busy} aria-busy={busy}>
            {busy ? <><span className="start-spinner" aria-hidden="true" /> Writing your story…</> : <>Generate My Video <span aria-hidden="true">→</span></>}
          </button>
          {busy && <p className="studio-form-status" role="status">Shaping your details into a short, scene-by-scene script.</p>}
        </form>
        <aside className="studio-form-aside" style={{ '--genre-accent': genre.accent } as React.CSSProperties}>
          <img src={genre.artUrl} alt="" aria-hidden="true" />
          <div className="studio-form-aside__veil" />
          <div className="studio-form-aside__copy"><span className="eyebrow">YOUR STORY, YOUR WAY</span><h2>{genre.name}<br /><em>in motion.</em></h2><p>{genre.descriptor}</p><div className="studio-aside-facts"><span>{durationSeconds}s film</span><span>{aspectRatio} frame</span><span>{targetAudience}</span></div></div>
        </aside>
      </div>
    </section>
  );
}
