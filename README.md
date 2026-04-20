# AI Vocabulary Hologram

A cinematic, multi-mode AI showcase built with React + Vite + MediaPipe + React Three Fiber.

## Features

- Real-time hand tracking from webcam using MediaPipe Hand Landmarker
- Stable gesture engine with smoothing, hysteresis, and start/hold/end state transitions
- Gesture controls:
  - Open Palm: summon vocabulary core
  - Pinch: select nodes and confirm quiz answers
  - Swipe Left / Right / Up: switch content modes and enter quiz
  - Pointing: hover quiz answers
- Futuristic holographic 3D scene:
  - Energy core and orbiting vocabulary nodes
  - Hand-follow reticle and particle field
  - Animated detail HUD + directional transitions
  - Quiz feedback (correct pulse / wrong highlight)
  - Finale transformation into a knowledge cube and CTA reveal
- Additional showcase mode: **AI Core: Cognitive Upgrade System**
  - Robotic 3D intelligence-core boot sequence
  - Core scan, interaction, opening, and neural-lattice expansion phases
  - Vocabulary represented as glowing knowledge nodes in an internal memory network
  - Final sci-fi gateway reveal that transitions users into the vocabulary platform mode
- In-app mode switcher for switching between showcase experiences

## Architecture

- `src/modules/handTracking`: webcam + MediaPipe integration, frame extraction, landmark smoothing
- `src/modules/gestureEngine`: gesture features, hysteresis gates, swipe detection, stable gesture snapshot
- `src/modules/interaction`: interaction state machine and mapping from gestures to UI/scene actions
- `src/modules/modeManager`: persistent experience mode management
- `src/modules/aiCore`: AI Core cognitive-upgrade controllers (interaction, animation, reveal sequencing, scene orchestration)
- `src/visual`: Three.js scene, HUD overlay, layout math
- `src/data`: vocabulary dataset

## Run

```bash
npm install
npm run dev
```

Then open the local URL in a browser, allow camera access, and interact with your hand.

## Build

```bash
npm run lint
npm run build
```

The output is static and deployable to Vercel (`dist/`).

## Deployment (Vercel)

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

No backend is required.
