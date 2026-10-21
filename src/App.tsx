import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SiteHeader } from './components/Brand';
import { stories } from './data/stories';
import type { AppSnapshot, CustomAdventureInput, StoryDefinition, StoryPreferences, StorySession } from './domain/types';
import { createCustomAdventure } from './engine/customAdventure';
import { applyChoice, createSession, findStory } from './engine/storyEngine';
import { activateSession, addCustomStory, loadSnapshot, saveSnapshot, updatePreferences, upsertSession } from './state/storage';
import { CreateScreen } from './screens/CreateScreen';
import { EndingScreen } from './screens/EndingScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function decoded(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function matchId(path: string, prefix: '/play/' | '/ending/'): string | undefined {
  if (!path.startsWith(prefix)) return undefined;
  const part = path.slice(prefix.length).split('/')[0];
  return part ? decoded(part) : undefined;
}

function backPath(path: string): string {
  if (path.startsWith('/play/')) return '/library';
  if (path.startsWith('/ending/')) return '/history';
  if (path === '/settings') return '/';
  return '/';
}

function moveDirectionalFocus(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight', target: EventTarget | null) {
  const active = target instanceof HTMLElement ? target : null;
  const tag = active?.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || active?.isContentEditable) return false;
  const candidates = [...document.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')]
    .filter((element) => element.isConnected && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);
  if (!candidates.length) return false;
  const current = candidates.includes(document.activeElement as HTMLElement) ? document.activeElement as HTMLElement : null;
  if (!current) {
    candidates[0]?.focus({ preventScroll: true });
    return true;
  }
  const currentRect = current.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;
  const horizontal = direction === 'ArrowLeft' || direction === 'ArrowRight';
  const sign = direction === 'ArrowRight' || direction === 'ArrowDown' ? 1 : -1;
  const positioned = candidates.filter((element) => element !== current).map((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const primary = horizontal ? (x - currentX) * sign : (y - currentY) * sign;
    const cross = horizontal ? Math.abs(y - currentY) : Math.abs(x - currentX);
    return { element, primary, cross };
  });
  const forward = positioned.filter((item) => item.primary > 4).sort((a, b) => (a.primary + a.cross * 1.6) - (b.primary + b.cross * 1.6));
  const wrapped = positioned.sort((a, b) => {
    const primaryA = horizontal ? a.element.getBoundingClientRect().left + a.element.getBoundingClientRect().width / 2 : a.element.getBoundingClientRect().top + a.element.getBoundingClientRect().height / 2;
    const primaryB = horizontal ? b.element.getBoundingClientRect().left + b.element.getBoundingClientRect().width / 2 : b.element.getBoundingClientRect().top + b.element.getBoundingClientRect().height / 2;
    return sign > 0 ? primaryA - primaryB : primaryB - primaryA;
  });
  (forward[0]?.element ?? wrapped[0]?.element)?.focus({ preventScroll: true });
  (document.activeElement as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  return true;
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname || '/');
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => loadSnapshot());
  const snapshotRef = useRef(snapshot);
  const [appError, setAppError] = useState<string | null>(null);
  const allStories = useMemo(() => [...snapshot.customStories, ...stories], [snapshot.customStories]);

  const updateApp = useCallback((transform: (current: AppSnapshot) => AppSnapshot) => {
    const next = transform(snapshotRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
    saveSnapshot(next);
  }, []);

  const navigate = useCallback((nextPath: string, replace = false) => {
    const safePath = nextPath.startsWith('/') ? nextPath : '/';
    if (replace) window.history.replaceState({ storyScreen: true }, '', safePath);
    else window.history.pushState({ storyScreen: true }, '', safePath);
    setPath(safePath);
    window.scrollTo({ top: 0, behavior: snapshotRef.current.preferences.reducedMotion ? 'auto' : 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.state?.storyScreen && window.history.length > 1) window.history.back();
    else navigate(backPath(window.location.pathname), true);
  }, [navigate]);

  useEffect(() => {
    const onPopState = () => { setPath(window.location.pathname || '/'); window.scrollTo({ top: 0, behavior: 'auto' }); };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        if (event.key === 'Backspace' && (tag === 'input' || tag === 'textarea')) return;
        event.preventDefault();
        goBack();
        return;
      }
      if (event.key.startsWith('Arrow') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        if (moveDirectionalFocus(event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight', event.target)) event.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [goBack]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const preferred = document.querySelector<HTMLElement>('[data-autofocus="true"]');
      const first = preferred ?? document.querySelector<HTMLElement>('[data-nav]:not([disabled])');
      first?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [path]);

  useEffect(() => {
    const titles: Record<string, string> = { '/': 'Home', '/library': 'Story Library', '/create': 'Create Adventure', '/history': 'Story History', '/settings': 'Settings' };
    document.title = `${titles[path] ?? (path.startsWith('/play/') ? 'Story Player' : 'StoryScreen')} — StoryScreen`;
  }, [path]);

  function startStory(story: StoryDefinition): boolean {
    try {
      const session = createSession(story, story.protagonist, story.customAdventure);
      updateApp((current) => {
        const withCustom = story.customAdventure ? addCustomStory(current, story) : current;
        return { ...upsertSession(withCustom, session), activeSessionId: session.id };
      });
      setAppError(null);
      navigate(`/play/${encodeURIComponent(session.id)}`);
      return true;
    } catch {
      setAppError('We couldn’t open that story. Your saved progress is safe; please try again.');
      return false;
    }
  }

  function createAdventure(input: CustomAdventureInput): boolean {
    try {
      return startStory(createCustomAdventure(input));
    } catch {
      setAppError('We couldn’t create that adventure. Check the details and try again.');
      return false;
    }
  }

  function choose(choiceId: string, session: StorySession, story: StoryDefinition) {
    try {
      const nextSession = applyChoice(story, session, choiceId);
      updateApp((current) => upsertSession(current, nextSession));
      setAppError(null);
      if (nextSession.completedAt) navigate(`/ending/${encodeURIComponent(session.id)}`);
    } catch {
      setAppError('That choice could not be loaded. Your saved progress is safe; please choose again or return to your history.');
    }
  }

  function setPreferences(preferences: StoryPreferences) {
    updateApp((current) => updatePreferences(current, preferences));
  }

  const sessionId = matchId(path, '/play/') ?? matchId(path, '/ending/');
  const currentSession = snapshot.sessions.find((item) => item.id === sessionId);
  const currentStory = currentSession ? findStory(allStories, currentSession.storyId) : undefined;
  const activeSession = snapshot.sessions.find((item) => item.id === snapshot.activeSessionId && !item.completedAt);
  const activeStory = activeSession ? findStory(allStories, activeSession.storyId) : undefined;
  const isImmersive = path.startsWith('/play/') || path.startsWith('/ending/');
  const appClasses = ['app', `app--${snapshot.preferences.textSize}`, snapshot.preferences.contrast ? 'app--contrast' : '', snapshot.preferences.reducedMotion ? 'app--reduce-motion' : ''].filter(Boolean).join(' ');
  const content = (() => {
    if (path === '/') return <HomeScreen stories={allStories} activeStory={activeStory} activeSession={activeSession} onStart={(story) => startStory(story)} onContinue={() => activeSession && navigate(`/play/${encodeURIComponent(activeSession.id)}`)} onNavigate={navigate} />;
    if (path === '/library') return <LibraryScreen stories={allStories} onStart={(story) => startStory(story)} onCreate={() => navigate('/create')} />;
    if (path === '/create') return <CreateScreen preferences={snapshot.preferences} onPreferences={setPreferences} onCreate={createAdventure} />;
    if (path === '/history') return <HistoryScreen sessions={snapshot.sessions} stories={allStories} onResume={(session) => { updateApp((current) => activateSession(current, session.id)); navigate(`/play/${encodeURIComponent(session.id)}`); }} onReplay={(story) => startStory(story)} onBrowse={() => navigate('/library')} />;
    if (path === '/settings') return <SettingsScreen preferences={snapshot.preferences} onUpdate={setPreferences} />;
    if ((path.startsWith('/play/') || path.startsWith('/ending/')) && currentSession && currentStory) {
      if (currentSession.completedAt) return <EndingScreen story={currentStory} session={currentSession} onReplay={() => startStory(currentStory)} onTryAnotherPath={() => navigate('/library')} onHistory={() => navigate('/history')} onHome={() => navigate('/')} />;
      return <PlayerScreen story={currentStory} session={currentSession} preferences={snapshot.preferences} onChoice={(choiceId) => choose(choiceId, currentSession, currentStory)} onHistory={() => navigate('/history')} />;
    }
    return <section className="screen empty-state"><div className="empty-state__mark">✦</div><h1>This page is between chapters.</h1><p>Your saved story is still safe on this device.</p><button className="button button--gold" data-nav onClick={() => navigate('/library')}>Browse the library <span aria-hidden="true">→</span></button></section>;
  })();

  return (
    <div className={appClasses}>
      {!isImmersive && <SiteHeader pathname={path} navigate={navigate} />}
      {appError && <div className="app-error" role="alert" aria-live="assertive"><span>{appError}</span><button data-nav onClick={() => setAppError(null)}>Dismiss</button></div>}
      <main id="main-content" className={isImmersive ? 'main-content main-content--immersive' : 'main-content'}>{content}</main>
      {!isImmersive && <footer className="site-footer"><span>© StoryScreen <i>·</i> Every choice changes the story.</span><span>Made for the moments between chapters.</span></footer>}
    </div>
  );
}
