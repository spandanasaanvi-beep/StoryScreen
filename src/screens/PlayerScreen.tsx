import { useEffect, useMemo, useState } from 'react';
import type { StoryDefinition, StoryPreferences, StorySession } from '../domain/types';
import { getCurrentScene } from '../engine/storyEngine';

type ArtStatus = 'loading' | 'ready' | 'failed';

function speakText(text: string, onStart: () => void, onDone: () => void, onError: (reason: string) => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 1.02;
    utterance.onstart = onStart;
    utterance.onend = onDone;
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      onDone();
      onError(event.error || 'unknown');
    };
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function PlayerScreen({ story, session, preferences, onChoice, onHistory }: {
  story: StoryDefinition;
  session: StorySession;
  preferences: StoryPreferences;
  onChoice: (choiceId: string) => void;
  onHistory: () => void;
}) {
  const scene = getCurrentScene(story, session);
  const [speaking, setSpeaking] = useState(false);
  const [votes, setVotes] = useState<string[]>([]);
  const [artStatus, setArtStatus] = useState<ArtStatus>(story.image ? 'loading' : 'failed');
  const [playbackError, setPlaybackError] = useState('');
  const [autoNarrationFailed, setAutoNarrationFailed] = useState(false);
  const family = preferences.players.map((player, index) => player.trim() || `Player ${index + 1}`).slice(0, 4);
  const narrationEnabled = session.customAdventure?.narration ?? preferences.narration;
  const voteTally = useMemo(() => votes.reduce<Record<string, number>>((tally, choiceId) => ({ ...tally, [choiceId]: (tally[choiceId] ?? 0) + 1 }), {}), [votes]);

  useEffect(() => {
    setAutoNarrationFailed(false);
    setPlaybackError('');
  }, [session.id]);

  useEffect(() => {
    setArtStatus(story.image ? 'loading' : 'failed');
  }, [story.image]);

  useEffect(() => {
    setVotes([]);
    setSpeaking(false);
    if (!autoNarrationFailed) setPlaybackError('');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (narrationEnabled && !autoNarrationFailed) {
      const timer = window.setTimeout(() => {
        const started = speakText(`${scene.title}. ${scene.body}`, () => setSpeaking(true), () => setSpeaking(false), (reason) => {
          setAutoNarrationFailed(true);
          setPlaybackError(reason === 'not-allowed' ? 'Automatic narration was blocked by this browser. Use Read aloud when ready; the story is still available.' : `Read-aloud stopped (${reason}). The on-screen story and choices are still available.`);
        });
        if (!started) { setAutoNarrationFailed(true); setSpeaking(false); setPlaybackError('Read-aloud is unavailable in this browser. The on-screen story and choices are still available.'); }
      }, 350);
      return () => { window.clearTimeout(timer); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
    }
    return () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, [scene.id, narrationEnabled, scene.body, scene.title, session.id, autoNarrationFailed]);

  function readAloud() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPlaybackError('Read-aloud is unavailable in this browser. The on-screen story and choices are still available.');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    setPlaybackError('');
    const started = speakText(`${story.title}. ${scene.title}. ${scene.body}`, () => setSpeaking(true), () => setSpeaking(false), (reason) => {
      setAutoNarrationFailed(true);
      setPlaybackError(`Read-aloud could not continue (${reason}). The on-screen story and choices are still available.`);
    });
    if (!started) { setAutoNarrationFailed(true); setSpeaking(false); setPlaybackError('Read-aloud could not start. The on-screen story and choices are still available.'); }
  }

  function castVote(choiceId: string) {
    setVotes((current) => current.length >= family.length ? current : [...current, choiceId]);
  }

  function revealVote() {
    const ranked = scene.choices.map((choice, index) => ({ id: choice.id, count: voteTally[choice.id] ?? 0, index })).sort((a, b) => b.count - a.count || a.index - b.index);
    if (ranked[0]) onChoice(ranked[0].id);
  }

  const voteComplete = votes.length >= family.length;
  const nextVoter = family[votes.length];
  const totalSteps = Object.values(story.scenes).filter((item) => !item.ending).length;
  const progress = Math.min(100, Math.round(((session.decisions.length + 1) / Math.max(1, totalSteps)) * 100));

  return (
    <section className="player-screen">
      <div className={`player-backdrop${artStatus === 'failed' ? ' player-backdrop--fallback' : ''}`} aria-hidden="true">
        {story.image && <img className="player-backdrop__image" src={story.image} alt="" onLoad={() => setArtStatus('ready')} onError={() => setArtStatus('failed')} />}
      </div>
      {artStatus === 'loading' && <div className="player-media-status" role="status">Loading story illustration…</div>}
      {artStatus === 'failed' && <div className="player-media-status player-media-status--fallback" role="status">Illustration unavailable — your story continues below.</div>}
      {playbackError && <div className="player-media-status player-media-status--fallback" role="status" aria-live="polite">{playbackError}</div>}
      <div className="player-topline"><button className="back-link" data-nav onClick={onHistory}><span aria-hidden="true">←</span> Save & leave</button><span className="player-story-title">{story.title}</span><button className="voice-button" data-nav onClick={readAloud} aria-pressed={speaking}><span aria-hidden="true">{speaking ? 'Ⅱ' : '◖'}</span> {speaking ? 'Stop narration' : 'Read aloud'}</button></div>
      <div className="player-progress" aria-label={`Story progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
      <div className="player-content">
        <div className="scene-copy">
          <span className="eyebrow scene-chapter">{scene.chapter} <span className="chapter-dot">·</span> {story.genre}</span>
          <h1>{scene.title}</h1>
          <div className="scene-setting">{scene.setting}</div>
          <div className="scene-body">{scene.body}</div>
          {preferences.captions && speaking && <div className="caption-bar" aria-live="polite"><span className="caption-icon">CC</span><span>{scene.body}</span></div>}
          <div className="continuity-tray continuity-tray--three">
            <div className="continuity-group"><span className="continuity-label">CARRYING</span><div className="continuity-chips">{session.inventory.length ? session.inventory.map((item) => <span className="continuity-chip" key={item}>✦ {item}</span>) : <span className="continuity-empty">Nothing yet</span>}</div></div>
            <div className="continuity-group"><span className="continuity-label">CLUES</span><div className="continuity-chips">{session.clues.length ? session.clues.map((item) => <span className="continuity-chip continuity-chip--clue" key={item}>⌕ {item}</span>) : <span className="continuity-empty">Still unfolding</span>}</div></div>
            <div className="continuity-group"><span className="continuity-label">BONDS</span><div className="continuity-chips">{Object.entries(session.relationships).length ? Object.entries(session.relationships).map(([name, level]) => <span className="continuity-chip continuity-chip--bond" key={name}>{name} <strong>{level > 0 ? `+${level}` : level}</strong></span>) : <span className="continuity-empty">Friends to meet</span>}</div></div>
          </div>
          {session.decisions.length > 0 && <div className="story-memory"><span className="continuity-label">LAST CHOICE</span><strong>{session.decisions[session.decisions.length - 1]?.choiceLabel}</strong></div>}
        </div>
        <div className="choice-panel">
          <span className="eyebrow choice-kicker">{preferences.familyVoting ? 'MAKE A FAMILY CHOICE' : 'WHAT WILL YOU DO?'}</span>
          {preferences.familyVoting && <div className="vote-instructions"><span className="vote-token">{voteComplete ? '✦' : String(votes.length + 1).padStart(2, '0')}</span><span><strong>{voteComplete ? 'All votes are in.' : `${nextVoter ?? 'Next player'}’s turn to choose.`}</strong><small>{voteComplete ? 'Reveal the choice your family made.' : 'Pass the remote after you vote.'}</small></span></div>}
          <div className="choice-list">{scene.choices.map((choice, index) => {
            const selectedByVoter = votes[votes.length - 1] === choice.id;
            return <button key={choice.id} className={`choice-button${selectedByVoter && preferences.familyVoting ? ' choice-button--voted' : ''}`} data-nav onClick={() => preferences.familyVoting ? castVote(choice.id) : onChoice(choice.id)} disabled={preferences.familyVoting && voteComplete}>
              <span className="choice-index">{String(index + 1).padStart(2, '0')}</span><span className="choice-copy"><strong>{choice.label}</strong><small>{choice.consequence}</small></span><span className="choice-arrow" aria-hidden="true">→</span>
            </button>;
          })}</div>
          {preferences.familyVoting && voteComplete && <div className="vote-results"><span className="continuity-label">FAMILY VOTE</span>{scene.choices.map((choice) => <span key={choice.id} className="vote-result-line"><span>{choice.label}</span><strong>{voteTally[choice.id] ?? 0}</strong></span>)}<button className="button button--gold reveal-vote" data-nav onClick={revealVote}>Reveal our choice <span aria-hidden="true">→</span></button></div>}
          <div className="choice-note"><span aria-hidden="true">✦</span> Your choices stay with the story.</div>
        </div>
      </div>
      <div className="player-footer"><div className="player-footer__protagonist"><span className={`character-token character-token--${preferences.protagonistStyle} character-token--${preferences.protagonistAccent}`} aria-hidden="true">{preferences.protagonistStyle === 'scout' ? '✦' : preferences.protagonistStyle === 'dreamer' ? '☾' : '✧'}</span><span>THIS CHAPTER BELONGS TO <strong>{session.protagonist}</strong>{session.customAdventure?.characterType && <> · <strong>{session.customAdventure.characterType}</strong></>}</span></div><span className="player-footer__tip">Arrows to choose <i>·</i> Enter to decide <i>·</i> Esc to save and leave</span></div>
    </section>
  );
}
