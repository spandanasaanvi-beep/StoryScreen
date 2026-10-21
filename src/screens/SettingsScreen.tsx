import { useId } from 'react';
import type { StoryPreferences } from '../domain/types';

function SettingToggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  const labelId = useId();
  const detailId = useId();
  return (
    <div className="setting-row">
      <span>
        <strong id={labelId}>{label}</strong>
        <small id={detailId}>{detail}</small>
      </span>
      <button
        className={`toggle${checked ? ' is-on' : ''}`}
        data-nav
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={detailId}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export function SettingsScreen({ preferences, onUpdate }: { preferences: StoryPreferences; onUpdate: (value: StoryPreferences) => void }) {
  function patch(changes: Partial<StoryPreferences>) { onUpdate({ ...preferences, ...changes }); }
  return (
    <section className="screen settings-screen">
      <div className="screen-intro screen-intro--compact"><span className="eyebrow"><span className="eyebrow-line" /> MAKE IT YOURS</span><h1>A story should<br/><em>feel like yours.</em></h1><p>These preferences are saved on this device and can be changed any time.</p></div>
      <div className="settings-layout">
        <div className="settings-column">
          <section className="settings-card"><div className="settings-card__heading"><span className="eyebrow">LISTEN & READ</span><span aria-hidden="true">◖</span></div>
            <SettingToggle label="Read-aloud narration" detail="Read each new scene using your browser’s voice." checked={preferences.narration} onChange={(value) => patch({ narration: value })} />
            <SettingToggle label="On-screen captions" detail="Keep scene narration visible alongside the story." checked={preferences.captions} onChange={(value) => patch({ captions: value })} />
            <div className="setting-row setting-row--block"><span><strong>Text size</strong><small>Make story text easier to read at a distance.</small></span><div className="segmented-control">{(['standard', 'large', 'extra-large'] as const).map((size) => <button data-nav key={size} className={preferences.textSize === size ? 'is-selected' : ''} aria-pressed={preferences.textSize === size} onClick={() => patch({ textSize: size })}>{size === 'standard' ? 'A' : size === 'large' ? 'A+' : 'A++'}</button>)}</div></div>
            <SettingToggle label="Higher contrast" detail="Strengthen borders and text separation." checked={preferences.contrast} onChange={(value) => patch({ contrast: value })} />
            <SettingToggle label="Reduce motion" detail="Use calmer, simpler transitions between screens." checked={preferences.reducedMotion} onChange={(value) => patch({ reducedMotion: value })} />
          </section>
          <section className="settings-card"><div className="settings-card__heading"><span className="eyebrow">AROUND THE REMOTE</span><span aria-hidden="true">⌘</span></div>
            <SettingToggle label="Family voting" detail="Let each player vote before the group sees the result." checked={preferences.familyVoting} onChange={(value) => patch({ familyVoting: value })} />
            <div className="player-names"><span className="form-label">Players</span>{preferences.players.slice(0, 4).map((player, index) => <label key={index} className="player-name-field"><span>Player {index + 1}</span><input data-nav maxLength={24} value={player} onChange={(event) => patch({ players: preferences.players.map((name, i) => i === index ? event.target.value : name) })} /></label>)}<button className="text-link" data-nav onClick={() => patch({ players: preferences.players.length < 4 ? [...preferences.players, `Player ${preferences.players.length + 1}`] : ['Player 1', 'Player 2'] })}>{preferences.players.length < 4 ? '+ Add a player' : 'Return to two players'}</button></div>
          </section>
        </div>
        <div className="settings-column">
          <section className="settings-card"><div className="settings-card__heading"><span className="eyebrow">YOUR STORY GUIDE</span><span aria-hidden="true">✦</span></div><p className="settings-blurb">A little character detail follows your new adventures. Choose the voice you like best.</p><div className="settings-choice-group">{(['scout', 'dreamer', 'inventor'] as const).map((style) => <button data-nav className={`settings-choice${preferences.protagonistStyle === style ? ' is-selected' : ''}`} key={style} onClick={() => patch({ protagonistStyle: style })}><span className={`style-option__shape style-option__shape--${style}`} /><span>{style === 'scout' ? 'Curious scout' : style === 'dreamer' ? 'Kind dreamer' : 'Inventive maker'}</span><i>{preferences.protagonistStyle === style ? '✓' : ''}</i></button>)}</div><div className="color-picker"><span className="form-label">A signature accent</span>{(['gold', 'teal', 'rose'] as const).map((color) => <button data-nav key={color} aria-label={`${color} accent`} title={`${color} accent`} className={`color-swatch color-swatch--${color}${preferences.protagonistAccent === color ? ' is-selected' : ''}`} onClick={() => patch({ protagonistAccent: color })} />)}</div></section>
          <section className="ai-status-card"><span className="ai-status-card__icon">✦</span><span className="eyebrow">A NOTE ABOUT AI STORIES</span><h2>Curiosity, no key required.</h2><p>StoryScreen runs on its deterministic story engine in this frontend-only version. No AI provider or secret is configured in the browser.</p><small>Future server-side AI support belongs on a trusted backend; your story still works if that service is unavailable.</small><span className="ai-status-card__status"><i /> Offline-ready engine active</span></section>
        </div>
      </div>
      <p className="settings-footnote">Guest mode · Preferences stay on this device · No sign-in needed</p>
    </section>
  );
}
