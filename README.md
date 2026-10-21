# StoryScreen

**Every choice changes the story.** StoryScreen is a guest-mode, landscape-first interactive story player built with React, TypeScript, and Vite. Its deterministic story engine works without an account, paid API, backend, or network call; saves and settings stay in the current browser's local storage.

## Run locally

Requirements: Node.js 20+ and npm 10.9.2 (the project pins its package-manager version in `package.json`). From the repository root:

```sh
npm ci
npm run dev
```

Vite serves the demo at `http://localhost:3000`. Build the deployable frontend with `npm run build`; `dist/` is the production output. Run `npm test` for the story-engine and persistence checks, or `npm run check` to run both tests and the production build.

## What's included

The experience includes Home, Story Library, Create Adventure, Story Player, Ending, Story History, and Settings. The three sample adventures are *The Lantern of a Thousand Wishes*, *The Mystery of the Missing Moon*, and *The Last Garden on Mars*. Choices move through a typed scene graph and update the session's decisions, inventory, clues, character relationships, and flags; each built-in story has multiple distinct endings. The Create Adventure form includes the eight supported genres, optional title, required character name/type and setting, age group, story length, narration On/Off, and validation. Custom adventures use these inputs in their story text, visual treatment, graph depth, and saved narration preference. The player is an illustrated interactive text adventure, not a video player; it shows scene narration and clickable choices immediately and keeps the scene playable if an illustration fails to load. The app also supports local save/resume/replay, configurable family voting, character flavor, captions, browser speech synthesis, text sizing, contrast, and reduced motion.

Keyboard/remote-oriented controls use arrow keys for directional focus, Enter to activate the focused control, and Escape or Backspace to go back (Backspace remains available for normal text editing in fields). This input model is intended for Fire TV-style remotes and is demoable in a desktop browser.

## AI and environment variables

This release is intentionally frontend-only. The deterministic provider is active and no AI service is called. `src/engine/provider.ts` defines the validated provider boundary/fallback behavior, and `.env.example` records names reserved for a future server-only adapter:

- `STORY_AI_BASE_URL`
- `STORY_AI_API_KEY`
- `STORY_AI_MODEL`
- `STORY_AI_MAX_SCENE_WORDS`

Those variables are documentation only in this version and have no effect on the frontend. **Do not create `VITE_`-prefixed secret variables or put provider keys in browser code.** When a real provider is added, its API request, credentials, response validation, timeout handling, and deterministic fallback must live on a trusted backend; validate generated text/choices, verify every scene link against the authoritative story graph, and keep scenes within the configured word limit.

## Deployment

Run `npm ci && npm run build` and host the contents of `dist/` on a static host that serves `index.html` for the app's client-side routes. The `public/manus-routes.json` file lists the app pages. The sample cover art is referenced through Manus project-storage paths; before deploying outside Manus, copy/rehost those images under `public/` and update the story image paths. No backend or managed database is required for this version. A future AI adapter will require a secure server deployment in addition to the static UI. Do not commit `.env` files or any secret.

## Limits to keep in mind

Progress is local to one browser/device; there is no login or cross-device synchronization. Read-aloud uses the browser/device's `SpeechSynthesis` support and available voices. Keyboard controls are implemented for desktop demo/remote-style navigation, but actual Fire TV hardware, packaging, store submission, and television-browser behavior have not been tested or included. The AI provider adapter is not enabled in this frontend-only release.
