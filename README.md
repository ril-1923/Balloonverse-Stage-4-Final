# BalloonVerse 3D — Explore Beyond the Horizon

A browser-based 3D hot air balloon flight simulator and mini adventure game built with React, TypeScript, Three.js and React Three Fiber. Take off from a launch pad, ride the wind across six procedural worlds, complete missions, design your own balloon and track your flying record. No backend, no accounts, no API keys, no external assets.

> **A game-style simulation, not a physically accurate flight model.**

## Features

**Flight simulator** (`#/simulator`)
- Real-geometry balloon: lathe-built envelope with coloured gores, woven-texture basket, posts, ropes and a burner with a layered animated flame and warm light.
- Simplified flight model: heat-based buoyancy, wind that strengthens with altitude, steering, velocity and altitude limits, a soft world boundary, ground and water collision.
- Flight states: Grounded → Inflating → Taking off → Flying → Descending → Landing → Landed, with soft/hard landing detection, flight timer, distance and best altitude.
- Four cameras (Chase, Basket, Side, Cinematic) with smooth blending, ground clamping and **drag-to-look** (mouse or touch).
- HUD: altitude ladder, vertical and ground speed, timer, distance, compass, wind dial, burner and air-heat gauges, tracked-mission strip; collapsible or fully hideable; pause menu; control guide.
- Reset Flight, Return to Launch autopilot, keyboard, mouse and touch controls (hold-to-use buttons).

**Six worlds** (`#/worlds`): Mountain Valley, Green Countryside (fields, villages, road bridge), Desert Adventure (dunes, mesas), Lake Paradise (a lake you can land on), Sunset Horizon, Night Sky (moon, stars, city lights, glowing lanterns). Each has its own terrain, palette, props and launch pad. Props are drawn with instancing. Switch worlds without reloading.

**Atmosphere**: six times of day (sunrise, morning, noon, golden hour, sunset, night) and four weather presets (clear, cloudy, misty, windy) that change sky, sun/moon light, ambient light, fog, clouds, stars and wind, blended smoothly. Manual wind direction and strength.

**Balloon Studio** (`#/studio`): live 3D preview; 10 presets; 3 colour slots with 12 swatches and a free colour picker; 6 patterns; 4 materials; 3 baskets; 4 burner flame effects; name; saved-design library (save, load, rename, delete with confirmation, restore samples). Duplicate names are numbered; names are validated.

**Missions** (`#/missions`): First Flight, Sky Explorer, Cloud Chaser, Mountain Explorer, Wind Rider, Golden Hour, Precision Landing, Long-Distance Adventure. Each runs on real simulation data. 3D markers (checkpoint rings, scenic beacon, landing target) appear for the tracked mission. Rewards are paid once.

**Achievements and Dashboard** (`#/dashboard`): 10 achievements that unlock on real conditions with notifications; lifetime statistics, favourite world, most-used balloon, flight history table and Recharts charts. Empty state before the first flight. Flights are recorded when they end in a landing, or when you reset or leave after at least 10 s in the air.

**Settings** (`#/settings`): graphics quality (Low/Medium/High: pixel ratio, anti-aliasing, terrain detail, prop density, cloud count, distant peaks); sound on/off and master volume; mouse sensitivity (flight camera and Studio preview); HUD visibility; starting camera; time-of-day preference; reduced motion (system/on/off); control reference; Reset Progress and Reset Settings, both behind confirmation dialogs.

**Audio**: generated with the Web Audio API (burner, wind, takeoff, landing, mission and achievement sounds). No audio files. It starts only after your first click or key press.

**Persistence**: LocalStorage with versioned keys (`balloonverse:v1:*`) for the current balloon, saved designs, progress, history, statistics, environment and settings. Reads never throw; corrupt or invalid data falls back to defaults and keeps whatever parts are valid.

**Accessibility and resilience**: responsive layouts, touch-sized controls, labelled controls, visible focus, skip link, focus moved to the page content on navigation, reduced-motion support, WebGL detection with a fallback screen, an error boundary and handling for lost graphics context.

## Technology

React 18, TypeScript (strict), Vite 5, Three.js 0.169, @react-three/fiber 8, @react-three/drei 9, Zustand, React Router (HashRouter), Bootstrap 5 and custom CSS, Recharts, Lucide icons, Vitest. Fonts (Fraunces, Figtree) are bundled via Fontsource, so there are no external requests.

## Getting started

```bash
npm install
npm run dev        # development server
npm run typecheck  # TypeScript check
npm test           # run the automated tests
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build locally
```

## Controls

| Input | Action |
| --- | --- |
| W / Space / ↑ | Burner (climb). Pressing it while grounded starts the lift-off. |
| S / ↓ | Vent hot air (descend) |
| A / ← and D / → | Steer left / right |
| Mouse or touch drag on the view | Look around (speed = Mouse sensitivity) |
| C | Cycle camera |
| R | Reset flight |
| P or Esc | Pause / resume |
| M | Sound on / off |
| H | Show / hide the HUD |

On touch screens use the on-screen Burner, Vent and arrow buttons. **Landing tip:** keep the sink rate under about 2.5 m/s using short burner bursts; without the burner the air keeps cooling and you will land hard.

## Deploying to GitHub Pages

1. Push this project to a GitHub repository whose default branch is `main`.
2. In the repository open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). `.github/workflows/deploy.yml` installs, tests, builds and publishes `dist/`.

The Vite `base` is `./` and routing uses `HashRouter`, so no repository name or server rewrite rules are needed.

## Project layout

```
src/
  components/  common/ home/ simulator/ studio/ missions/ dashboard/
  pages/       Home, Simulator, WorldExplorer, BalloonStudio, Missions, Dashboard, Settings, NotFound
  simulation/  flightPhysics, flightController, worldDefinitions, atmosphere, missionEngine,
               missionTargets, flightSession, achievements, quality, cameraLook, scatter
  store/       Zustand stores: flight UI, environment, balloon, progress, settings, notifications
  audio/       Web Audio engine and pure mixing rules
  hooks/  utils/  types/  styles/
```

Simulation logic is pure TypeScript with no rendering dependency, which is why it can be tested without a browser.

## Verification status

| Check | Status |
| --- | --- |
| `tsc --noEmit` (strict) | Passes |
| `vitest run` — 224 tests in 14 files | Passes |
| `vite build` (relative base path) | Passes |
| Every route renders without throwing (server-rendered smoke test, including the no-WebGL fallbacks) | Passes |
| Stages 1–3 (core simulator, worlds and atmosphere, studio/missions/dashboard) in a real browser | Reported working by the project owner |
| **Stage 4** (settings page, graphics quality effects, audio, drag-to-look, HUD hide, skip link) in a real browser | **Not tested by the author.** Please run it and check. |
| GitHub Pages workflow | **Never run.** Written but not executed. |

What the tests cover: flight movement, ascent/descent, velocity limits, ground and water collision, landing detection, distance, timer, wind and weather, every mission condition, achievement unlocking, flight recording against the real simulation, balloon design persistence, settings persistence, invalid-LocalStorage recovery, graphics quality scaling, drag-to-look maths and audio mixing rules.

## Known limitations

- The Web Audio engine cannot be tested in Node; only its mixing rules and its safe no-op behaviour are tested. Sound levels and timbre were chosen by reasoning, not by ear, and may need tuning (`src/audio/`).
- Whether dragging feels natural (direction and speed) depends on taste; the maths is tested, the feel is not.
- Sky, light and fog values (`src/simulation/atmosphere.ts`) were tuned by reasoning rather than by eye.
- Changing graphics quality restarts the 3D view. Switching world rebuilds terrain on the main thread, so a short hitch is possible on slow machines.
- Lakes use a tinted translucent surface, not real reflections. No rain, snow or lightning.
- Spatial missions (rings, beacon, landing target) only count while they are the tracked mission. Only the best percentage per mission is remembered between flights.
- The history keeps the latest 100 flights; lifetime totals keep counting.
- Data lives in this browser only. Private windows or blocked storage fall back to memory and are lost on close.
- Not checked on real phones and tablets: HUD spacing, chart sizing and touch-control placement on small screens.
