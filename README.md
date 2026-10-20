# FitLiving AI 🏋️‍♂️📺

> A Somali- and English-language workout coach designed for TVs and large displays.

<img width="959" height="539" alt="FitLiving AI home dashboard" src="https://github.com/user-attachments/assets/ae185375-5765-4094-be9f-bee4f3b5887a" />
<img width="959" height="539" alt="FitLiving AI workout screen" src="https://github.com/user-attachments/assets/2897eb91-0206-4b4f-8267-2fbe69c12768" />
<img width="959" height="419" alt="FitLiving AI progress screen" src="https://github.com/user-attachments/assets/025842dd-0057-47c0-a11a-92dca461df10" />

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built for: TV and large displays](https://img.shields.io/badge/Built%20for-TV%20%26%20large%20displays-orange.svg)](#tv-remote--keyboard-controls)
[![Stack: React, TypeScript, MediaPipe](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20MediaPipe-blue.svg)](#architecture--tech-stack)

---

## Overview

FitLiving AI turns a browser on a TV or large display into an interactive home workout coach. Its high-contrast interface supports keyboard and on-screen remote navigation, while optional MediaPipe pose tracking estimates reps in the browser. Workout summaries and progress history are saved locally on the device.

The app is a responsive web application; it is not a native Fire TV app. Use a browser with camera support for live tracking.

## Features

- **TV-friendly controls:** Spatial arrow-key navigation, visible focus states, Enter/Space activation, and an on-screen directional remote.
- **Live pose tracking:** MediaPipe Pose Landmarker estimates squats, push-ups, and jumping jacks on-device.
- **Push-up form and levels:** Counts a rep after a visible side-profile starts with the arm extended, bends the elbow to 90° or less with a straight shoulder–hip–ankle line, then returns to at least 160°. Beginner, Intermediate, and Expert workouts have different targets.
- **Manual rep fallback:** Use the **+1 Rep (Space)** button or press Space during an active workout if camera tracking is unavailable.
- **English and Somali:** Switch languages with the SO / EN control; the choice is saved in browser storage.
- **Voice and sound:** Uses the browser Web Speech API and locally generated Web Audio sound effects.
- **Workout summary:** Shows completed reps, elapsed time, and estimated calories after a session.
- **Local progress:** Saves completed workouts and displays totals, recent workouts, and history from `localStorage`.

Rep counts and calorie values are estimates, not medical or clinical measurements.

## TV Remote & Keyboard Controls

| Remote / control | Keyboard | Action |
| --- | --- | --- |
| D-pad directions | `↑` `↓` `←` `→` | Move focus between controls |
| Select / OK | `Enter` | Activate the focused control |
| Manual rep | `Space` | Add one rep during an active workout |
| Back | `Escape` / `Backspace` | Pause a running workout and ask whether to exit; return Home from a paused workout |
| Home | `Home` | Return to the dashboard |
| Browser fullscreen | `F11` | Toggle browser fullscreen where supported |

## Architecture & Tech Stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS 4
- `@mediapipe/tasks-vision` for browser-based pose tracking
- Web Speech API and Web Audio API
- React state and `localStorage` for workout and language persistence

## Getting Started

### Requirements

- Node.js supported by the installed Vite version and npm
- A modern browser; camera tracking requires camera permission and `localhost` or HTTPS
- An internet connection the first time pose tracking is used, to load the MediaPipe runtime and model

### Install and run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Select a workout and choose **Daar kamarada** to start live tracking. For push-ups, place the camera low and view the exercise from the side so it can see an arm and the shoulder, hip, and ankle.

### Production build and checks

```sh
npm run build
npm run preview
npm run lint
npm run test:pose
```

## Project Structure

```text
FitLiving-AI/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── App.css          # Application layout and TV-responsive styles
│   ├── App.tsx          # Dashboard, workouts, remote, and progress UI
│   ├── index.css        # Global styles
│   ├── main.tsx         # React entry point
│   ├── pose.ts          # Pose angles and repetition classification
│   └── pose.test.ts     # Pose and rep-state tests
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Privacy & Safety

- Camera video and pose landmarks are processed in the browser and are not recorded or uploaded by this app.
- The MediaPipe runtime and pose model are downloaded from external hosting when live tracking is first started.
- Workout history and language preference are stored in the current browser's `localStorage`; clearing browser storage removes them.
- Exercise tracking may be inaccurate. Keep a clear camera view, exercise within your comfort level, and stop if you feel pain.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Acknowledgments

- **Developer:** Abdirahman Mohamed
- Built for the **Build, Ship, Shape: Amazon Developer Hackathon 2026** (Fire TV track).
