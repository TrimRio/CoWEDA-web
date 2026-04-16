# CoWEDA Dashboard

Cold Weather Dress Assessment dashboard built with React + Vite.

## Project Structure

```
src/
├── main.jsx                  # App entry point — mounts React, imports CSS
├── App.jsx                   # Main layout and state management
├── styles.css                # All global CSS (extracted from original HTML)
├── data/
│   └── constants.js          # Static data: ACTIVITIES, CLOTHING_DB, ZONES_RISK, etc.
└── components/
    ├── Slider.jsx             # Range slider with colored track
    ├── Chips.jsx              # Pill-button toggle group
    ├── EnsembleControls.jsx   # Ensemble select / rename / delete
    ├── Silhouette.jsx         # SVG body figure with clickable zones
    └── ClothingModal.jsx      # Zone clothing picker modal
```

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. You can deploy that folder to any static host (Netlify, Vercel, GitHub Pages, etc.).
